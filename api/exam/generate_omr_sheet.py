"""
OMR Sheet Generator v2.1

Generates:
1. OMR answer sheet PDF with corner markers, timing marks, bubble grids
2. Pre-built omr_template_XX.json files (XX = 20, 40, 60, 80, 100)

Template Tier System:
- 5 fixed tiers: 20, 40, 60, 80, 100 questions
- num_questions is rounded UP to the nearest tier for the PDF layout
- The scanner picks the matching tier template at scan time
- Ghost reading prevention: scanner stops at test.num_questions

Coordinate Systems:
- ReportLab: origin at BOTTOM-LEFT, Y goes UP
- Image/JSON: origin at TL marker center, Y goes DOWN
- Formula: json_x = (abs_x - TL_cx) / content_w * target_w
            json_y = (TL_cy - abs_y) / content_h * target_h
"""

import json
import os
import math
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from .pdf_utils import register_vietnamese_fonts


# ==============================================================================
# TEMPLATE TIER SYSTEM
# ==============================================================================

TEMPLATE_TIERS = [20, 40, 60, 80, 100]


def get_tier(num_questions):
    """Round num_questions UP to the nearest template tier.
    Examples: 1->20, 20->20, 21->40, 55->60, 100->100
    """
    for tier in TEMPLATE_TIERS:
        if num_questions <= tier:
            return tier
    return TEMPLATE_TIERS[-1]  # cap at 100


def get_template_dir():
    """Return absolute path to the omr_templates/ directory."""
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), 'omr_templates')


def get_template_path(num_questions):
    """Return the template file path for the given question count."""
    tier = get_tier(num_questions)
    return os.path.join(get_template_dir(), f'omr_template_{tier}.json')


# ==============================================================================
# LAYOUT ENGINE
# ==============================================================================

class OMRSheetLayout:
    """
    Computes all absolute positions (in ReportLab points) for every element
    on the OMR sheet. Provides conversion to JSON pixel coordinates.

    Usage:
        layout = OMRSheetLayout(num_questions=20, num_choices=4)
        pdf_buf = generate_pdf(layout, title, variant_code, questions)
        template = layout.to_template_json()
    """

    def __init__(self, num_questions=20, num_choices=4, target_w=800, target_h=1000):
        self.num_questions = num_questions
        self.num_choices = num_choices
        self.target_w = target_w
        self.target_h = target_h

        # A4 page dimensions
        self.page_w, self.page_h = A4

        # Layout constants (points)
        self.margin = 2 * cm
        self.marker_size = 0.6 * cm
        self.m = 0.8 * cm  # marker offset from paper edge

        # Bubble constants
        self.bubble_r = 0.22 * cm
        self.digit_spacing = 0.65 * cm   # X gap between column centers
        self.row_spacing = 0.55 * cm     # Y gap between row centers
        self.box_size = 0.55 * cm        # header input box size
        self.num_label_width = 0.7 * cm  # width for question number label

        # Block grouping
        self.block_size = 5
        self.block_gap = 0.25 * cm

        # Question columns
        self.num_q_columns = 5
        self.max_per_column = 20

        # Timing mark dimensions
        self.tm_w = 0.25 * cm
        self.tm_h = 0.2 * cm
        # X position: just right of TL marker right edge + small gap
        self.tm_x = self.m + self.marker_size + 0.1 * cm

        # === MARKER CENTERS (ReportLab coords) ===
        self.tl_cx = self.m + self.marker_size / 2
        self.tl_cy = self.page_h - self.m - self.marker_size / 2
        self.tr_cx = self.page_w - self.m - self.marker_size / 2
        self.tr_cy = self.tl_cy
        self.bl_cx = self.tl_cx
        self.bl_cy = self.m + self.marker_size / 2
        self.br_cx = self.tr_cx
        self.br_cy = self.bl_cy

        # Content span: center-to-center distance between markers
        # CRITICAL: must match exactly what cv2.warpPerspective uses
        self.content_w = self.tr_cx - self.tl_cx
        self.content_h = self.tl_cy - self.bl_cy

        # Compute all element positions
        self._compute_layout()

    # --------------------------------------------------------------------------
    # Coordinate conversion
    # --------------------------------------------------------------------------

    def to_px(self, abs_x, abs_y):
        """Convert ReportLab absolute coords to JSON pixel coords
        relative to TL marker center after warp."""
        json_x = (abs_x - self.tl_cx) / self.content_w * self.target_w
        json_y = (self.tl_cy - abs_y) / self.content_h * self.target_h
        return round(json_x, 2), round(json_y, 2)

    def pts_to_px_x(self, pts):
        """Convert a horizontal distance in points to pixels."""
        return round(pts / self.content_w * self.target_w, 2)

    def pts_to_px_y(self, pts):
        """Convert a vertical distance in points to pixels."""
        return round(pts / self.content_h * self.target_h, 2)

    # --------------------------------------------------------------------------
    # Layout computation
    # --------------------------------------------------------------------------

    def _compute_layout(self):
        """Compute absolute positions for all elements."""
        # Title & full name
        self.title_y = self.page_h - self.margin
        self.fullname_y = self.title_y - 1.2 * cm
        header_y = self.fullname_y - 1.3 * cm

        # ---- STUDENT ID block (8 digits) ----
        sid_x = self.margin
        self.student_id = self._compute_digit_block(sid_x, header_y, 8, "STUDENT ID")

        # ---- TEST ID block (3 digits) ----
        tid_x = sid_x + 8 * self.digit_spacing + 1.2 * cm
        self.test_id = self._compute_digit_block(tid_x, header_y, 3, "TEST ID")

        # Header height
        header_h = max(self.student_id['total_height'], self.test_id['total_height'])
        self.questions_start_y = header_y - header_h - 1.2 * cm

        # ---- ANSWER COLUMNS (dynamic, up to 5 cols × 20 rows = 100 questions) ----
        first_col_x = self.margin
        available_w = self.page_w - self.margin - first_col_x
        self.col_step = available_w / self.num_q_columns

        q_per_col = self.max_per_column

        self.answer_columns = []
        q_idx = 0
        for col in range(self.num_q_columns):
            if q_idx >= self.num_questions:
                break
            count = min(q_per_col, self.num_questions - q_idx)
            if count <= 0:
                break
            x_col = first_col_x + col * self.col_step
            block = self._compute_answer_column(x_col, self.questions_start_y, q_idx, count)
            self.answer_columns.append(block)
            q_idx += count

        # ---- TIMING MARKS ----
        self._compute_timing_marks()

    def _compute_digit_block(self, x_start, y_start, num_digits, label):
        """Compute positions for a digit bubble grid (STUDENT ID / TEST ID)."""
        # Title row
        title_pos = (x_start, y_start)

        # Header box row
        box_y = y_start - 0.45 * cm

        # Bubble grid starts below box row
        bubble_start_y = box_y - self.box_size - 0.3 * cm

        # Origin = center of first bubble (row=0, col=0)
        origin_x = x_start + self.digit_spacing / 2
        origin_y = bubble_start_y

        # Row Y positions (for timing marks)
        row_ys = [bubble_start_y - r * self.row_spacing for r in range(10)]

        # Total height from y_start to last row
        total_h = y_start - row_ys[-1]

        return {
            'label': label,
            'x_start': x_start,
            'y_start': y_start,
            'num_digits': num_digits,
            'origin': (origin_x, origin_y),
            'gap_x': self.digit_spacing,
            'gap_y': self.row_spacing,
            'rows': 10,
            'cols': num_digits,
            'row_ys': row_ys,
            'box_y': box_y,
            'total_height': total_h,
        }

    def _compute_answer_column(self, x_col, y_start, q_start, count):
        """Compute positions for one column of answer bubbles."""
        # Header row at y_start
        y = y_start

        # First bubble after header row
        first_bubble_y = y - self.row_spacing
        first_bubble_x = x_col + self.num_label_width + self.digit_spacing / 2

        # Row Y positions (each question row)
        row_ys = []
        cur_y = first_bubble_y
        for r in range(count):
            if r > 0 and r % self.block_size == 0:
                cur_y -= self.block_gap
            row_ys.append(cur_y)
            cur_y -= self.row_spacing

        return {
            'q_start': q_start,
            'q_count': count,
            'x_col': x_col,
            'origin': (first_bubble_x, first_bubble_y),
            'gap_x': self.digit_spacing,
            'gap_y': self.row_spacing,
            'block_size': self.block_size,
            'block_gap': self.block_gap,
            'rows': count,
            'cols': self.num_choices,
            'row_ys': row_ys,
            'header_y': y_start,
        }

    def _compute_timing_marks(self):
        """Compute positions for ALL timing marks on the left margin.
        One mark per header digit row + one per answer question row."""
        self.timing_marks = []

        # Header digit rows (shared Y for STUDENT ID and TEST ID)
        for i, y in enumerate(self.student_id['row_ys']):
            self.timing_marks.append({
                'section': 'header',
                'row': i,
                'abs_x': self.tm_x,
                'abs_y': y,
            })

        # Answer question rows (all columns share same Y)
        if self.answer_columns:
            for i, y in enumerate(self.answer_columns[0]['row_ys']):
                self.timing_marks.append({
                    'section': 'answers',
                    'row': i,
                    'abs_x': self.tm_x,
                    'abs_y': y,
                })

    # --------------------------------------------------------------------------
    # Template JSON generation
    # --------------------------------------------------------------------------

    def to_template_json(self):
        """Generate the v2.0 grid-based omr_template.json."""
        gap_x_px = self.pts_to_px_x(self.digit_spacing)
        gap_y_px = self.pts_to_px_y(self.row_spacing)

        # Student ID block
        sid_o = self.to_px(*self.student_id['origin'])
        # Test ID block
        tid_o = self.to_px(*self.test_id['origin'])

        blocks = {
            'student_id': {
                'type': 'digit_grid',
                'label': 'STUDENT ID',
                'origin': {'x': sid_o[0], 'y': sid_o[1]},
                'cols': self.student_id['cols'],
                'rows': self.student_id['rows'],
                'gap_x': gap_x_px,
                'gap_y': gap_y_px,
                'header_row': True,
                'digit_values': list(range(10)),
                'thresholds': {'fill_ratio': 1.5},
            },
            'test_id': {
                'type': 'digit_grid',
                'label': 'TEST ID',
                'origin': {'x': tid_o[0], 'y': tid_o[1]},
                'cols': self.test_id['cols'],
                'rows': self.test_id['rows'],
                'gap_x': gap_x_px,
                'gap_y': gap_y_px,
                'header_row': True,
                'digit_values': list(range(10)),
                'thresholds': {'fill_ratio': 1.5},
            },
        }

        # Answer column blocks
        block_gap_y_px = self.pts_to_px_y(self.block_gap)
        for i, col in enumerate(self.answer_columns):
            origin = self.to_px(*col['origin'])
            blocks[f'answers_col_{i+1}'] = {
                'type': 'answer_grid',
                'label': f"Questions {col['q_start']+1}-{col['q_start']+col['q_count']}",
                'origin': {'x': origin[0], 'y': origin[1]},
                'cols': col['cols'],
                'rows': col['rows'],
                'gap_x': gap_x_px,
                'gap_y': gap_y_px,
                'block_size': col['block_size'],
                'block_gap_y': block_gap_y_px,
                'choice_labels': [chr(65 + j) for j in range(self.num_choices)],
                'question_start': col['q_start'] + 1,
                'thresholds': {'min_fill_pixels': 80, 'fill_ratio': 1.5},
            }

        # Timing mark pixel positions
        tm_px = []
        for tm in self.timing_marks:
            px = self.to_px(tm['abs_x'], tm['abs_y'])
            tm_px.append({
                'section': tm['section'],
                'row': tm['row'],
                'x': px[0],
                'y': px[1],
            })

        return {
            'version': '2.0',
            'name': 'testgen_omr_v2',
            'description': (
                'Grid-based OMR template. All coordinates in pixels '
                'relative to TL marker center after warp to target size.'
            ),
            'target_warp_size': {
                'width': self.target_w,
                'height': self.target_h,
            },
            'timing_marks': {
                'side': 'left',
                'mark_width_px': self.pts_to_px_x(self.tm_w),
                'mark_height_px': self.pts_to_px_y(self.tm_h),
                'positions': tm_px,
            },
            'blocks': blocks,
            'bubble_radius_px': self.pts_to_px_x(self.bubble_r),
            'global_thresholds': {
                'relative_fill_ratio': 1.5,
            },
        }


# ==============================================================================
# PDF DRAWING
# ==============================================================================

def generate_pdf(layout, title, variant_code, questions=None):
    """
    Draw the OMR sheet PDF using pre-computed layout positions.
    Returns a BytesIO buffer containing the PDF.
    """
    font_regular, font_bold = register_vietnamese_fonts()

    buf = BytesIO()
    p = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    # ======================== PAGE 1: OMR SHEET ========================

    # ---- Corner markers ----
    ms = layout.marker_size
    m = layout.m
    p.setFillColorRGB(0, 0, 0)
    p.rect(m, m, ms, ms, fill=1)                           # BL
    p.rect(w - m - ms, m, ms, ms, fill=1)                   # BR
    p.rect(m, h - m - ms, ms, ms, fill=1)                   # TL
    p.rect(w - m - ms, h - m - ms, ms, ms, fill=1)          # TR

    # ---- Timing marks ----
    for tm in layout.timing_marks:
        tx = tm['abs_x']
        ty = tm['abs_y']
        p.rect(tx, ty - layout.tm_h / 2, layout.tm_w, layout.tm_h, fill=1)

    # ---- Title ----
    p.setFont(font_bold, 12)
    p.setFillColorRGB(0, 0, 0)
    p.drawCentredString(w / 2, layout.title_y, title.upper())

    # ---- Full name line ----
    p.setFont(font_regular, 10)
    p.drawString(layout.margin, layout.fullname_y,
                 "Full name: _______________________________________________")

    # ---- STUDENT ID block ----
    _draw_digit_block(p, layout, layout.student_id, font_regular, font_bold)

    # ---- TEST ID block (pre-filled) ----
    test_id_digits = list(str(variant_code)) if variant_code else None
    _draw_digit_block(p, layout, layout.test_id, font_regular, font_bold,
                      filled_digits=test_id_digits)

    # ---- Answer columns ----
    for col_block in layout.answer_columns:
        _draw_answer_column(p, layout, col_block, font_regular, font_bold)

    # ======================== PAGE 2+: QUESTION CONTENT ========================
    if questions:
        p.showPage()
        _draw_question_pages(p, layout, title, variant_code, questions,
                             font_regular, font_bold)

    p.save()
    buf.seek(0)
    return buf


def _draw_digit_block(p, layout, block, font_regular, font_bold,
                      filled_digits=None):
    """Draw a digit bubble grid (STUDENT ID or TEST ID)."""
    x_start = block['x_start']
    y_start = block['y_start']
    num_digits = block['num_digits']
    box_size = layout.box_size
    bubble_r = layout.bubble_r
    ds = layout.digit_spacing
    rs = layout.row_spacing

    # Title
    p.setFont(font_bold, 8)
    p.setFillColorRGB(0, 0, 0)
    p.drawString(x_start, y_start, block['label'])

    # Header input boxes
    box_y = block['box_y']
    for d in range(num_digits):
        cx = x_start + d * ds + ds / 2
        bx = cx - box_size / 2
        p.setLineWidth(1.5)
        p.setStrokeColorRGB(0, 0, 0)
        p.setFillColorRGB(1, 1, 1)
        p.rect(bx, box_y - box_size, box_size, box_size, fill=1)

        # Pre-fill digit text in box
        if filled_digits and d < len(filled_digits):
            p.setFont(font_bold, 10)
            p.setFillColorRGB(0, 0, 0)
            dt = str(filled_digits[d])
            tw = p.stringWidth(dt, font_bold, 10)
            p.drawString(cx - tw / 2, box_y - box_size + 0.12 * cm, dt)

    # 10 rows of bubbles (digits 0-9)
    for row in range(10):
        y = block['row_ys'][row]
        for col in range(num_digits):
            cx = x_start + col * ds + ds / 2

            is_filled = (
                filled_digits
                and col < len(filled_digits)
                and str(row) == str(filled_digits[col])
            )

            p.setLineWidth(1)
            p.setStrokeColorRGB(0.25, 0.25, 0.25)
            if is_filled:
                p.setFillColorRGB(0.1, 0.1, 0.1)
                p.circle(cx, y, bubble_r, stroke=1, fill=1)
                p.setFont(font_regular, 6)
                p.setFillColorRGB(1, 1, 1)
            else:
                p.setFillColorRGB(1, 1, 1)
                p.circle(cx, y, bubble_r, stroke=1, fill=1)
                p.setFont(font_regular, 6)
                p.setFillColorRGB(0.2, 0.2, 0.2)

            tw = p.stringWidth(str(row), font_regular, 6)
            p.drawString(cx - tw / 2, y - 0.07 * cm, str(row))


def _draw_answer_column(p, layout, col_block, font_regular, font_bold):
    """Draw one column of answer bubbles with header and block grouping."""
    x_col = col_block['x_col']
    header_y = col_block['header_y']
    num_choices = layout.num_choices
    ds = layout.digit_spacing
    nlw = layout.num_label_width
    bubble_r = layout.bubble_r

    # Header row: A B C D
    p.setFont(font_bold, 7)
    p.setFillColorRGB(0, 0, 0)
    for i in range(num_choices):
        cx = x_col + nlw + i * ds + ds / 2
        label = chr(65 + i)
        tw = p.stringWidth(label, font_bold, 7)
        p.drawString(cx - tw / 2, header_y - 0.07 * cm, label)

    # Question rows
    for r in range(col_block['rows']):
        y = col_block['row_ys'][r]
        q_num = col_block['q_start'] + r + 1

        # Question number label
        p.setFont(font_bold, 8)
        p.setFillColorRGB(0, 0, 0)
        q_label = str(q_num)
        lw = p.stringWidth(q_label, font_bold, 8)
        p.drawString(x_col + nlw - lw - 0.1 * cm, y - 0.07 * cm, q_label)

        # Bubbles
        for i in range(num_choices):
            cx = x_col + nlw + i * ds + ds / 2

            p.setLineWidth(1)
            p.setStrokeColorRGB(0.25, 0.25, 0.25)
            p.setFillColorRGB(1, 1, 1)
            p.circle(cx, y, bubble_r, stroke=1, fill=1)

            p.setFont(font_regular, 6)
            p.setFillColorRGB(0.2, 0.2, 0.2)
            label = chr(65 + i)
            tw = p.stringWidth(label, font_regular, 6)
            p.drawString(cx - tw / 2, y - 0.07 * cm, label)


def _draw_question_pages(p, layout, title, variant_code, questions,
                         font_regular, font_bold):
    """Draw question content on subsequent pages."""
    w, h = A4
    margin = layout.margin
    current_y = h - margin

    p.setFont(font_bold, 14)
    p.setFillColorRGB(0, 0, 0)
    p.drawCentredString(w / 2, current_y, title.upper())
    current_y -= 0.8 * cm

    p.setFont(font_bold, 11)
    p.drawCentredString(w / 2, current_y, f"Test ID: {variant_code}")
    current_y -= 1.2 * cm

    for idx, q in enumerate(questions):
        prompt = q.get('prompt', '')
        options = q.get('options', [])

        needed_h = 0.8 * cm + len(options) * 0.5 * cm
        if current_y - needed_h < margin:
            p.showPage()
            current_y = h - margin

        # Question prompt
        p.setFont(font_bold, 10)
        p.setFillColorRGB(0, 0, 0)
        max_tw = w - 2 * margin - 1 * cm
        q_text = f"Q{idx+1}. {prompt}"

        lines = []
        words = q_text.split()
        cur_line = ''
        for word in words:
            test = f"{cur_line} {word}".strip()
            if p.stringWidth(test, font_bold, 10) <= max_tw:
                cur_line = test
            else:
                if cur_line:
                    lines.append(cur_line)
                cur_line = word
        if cur_line:
            lines.append(cur_line)

        for line in lines:
            p.drawString(margin, current_y, line)
            current_y -= 0.45 * cm

        # Options
        p.setFont(font_regular, 10)
        for oi, opt in enumerate(options):
            opt_label = chr(65 + oi)
            p.drawString(margin + 0.8 * cm, current_y,
                         f"{opt_label}. {opt.get('text', '')}")
            current_y -= 0.45 * cm

        current_y -= 0.3 * cm


# ==============================================================================
# PUBLIC API
# ==============================================================================

def generate_omr_sheet(title, variant_code, num_questions, num_choices,
                       questions=None):
    """
    Generate OMR sheet PDF using the appropriate template tier.

    The PDF layout uses the tier (rounded UP from num_questions),
    so bubble grids always have 20/40/60/80/100 rows.
    Question content pages still only show the actual questions.

    Templates are NOT overwritten — they are pre-generated
    by generate_all_templates() and stored in omr_templates/.

    Args:
        title: Test title
        variant_code: 3-digit variant code string
        num_questions: Number of questions (1-100)
        num_choices: Number of answer choices per question
        questions: Optional list of question dicts for content pages

    Returns:
        (pdf_buffer, template_dict)
    """
    tier = get_tier(num_questions)
    layout = OMRSheetLayout(tier, num_choices)
    pdf_buf = generate_pdf(layout, title, variant_code, questions)
    template = layout.to_template_json()
    return pdf_buf, template


def generate_all_templates(num_choices=4):
    """
    Pre-generate all 5 template tier JSON files in omr_templates/.
    Uses the exact same OMRSheetLayout class as PDF generation
    to ensure perfect coordinate synchronization.

    Call this once during deployment or after layout changes.
    """
    out_dir = get_template_dir()
    os.makedirs(out_dir, exist_ok=True)

    for tier in TEMPLATE_TIERS:
        layout = OMRSheetLayout(tier, num_choices)
        template = layout.to_template_json()

        path = os.path.join(out_dir, f'omr_template_{tier}.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(template, f, indent=2, ensure_ascii=False)

        print(f"[OMR] Template tier {tier:3d}: {path}")

    print(f"[OMR] All {len(TEMPLATE_TIERS)} templates generated in {out_dir}")
