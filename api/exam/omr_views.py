from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.http import FileResponse
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER
from exam.models import PaperTest, PaperTestQuestion
from question_bank.models import Question
import os

# ✅ Font Registration - SỬA ĐƯỜNG DẪN
def register_fonts():
    """Register fonts for PDF generation"""
    try:
        # ✅ CHỈ ĐI LÙI 2 CẤP (exam/ → api/ → fonts/)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        fonts_dir = os.path.join(base_dir, 'fonts')
        
        print(f"[Font] Current file: {__file__}")
        print(f"[Font] Base dir: {base_dir}")
        print(f"[Font] Fonts dir: {fonts_dir}")
        
        if not os.path.exists(fonts_dir):
            print(f"[Font] ❌ Fonts directory not found: {fonts_dir}")
            return "Helvetica", "Helvetica-Bold"
        
        regular_font = os.path.join(fonts_dir, 'DejaVuSans.ttf')
        bold_font = os.path.join(fonts_dir, 'DejaVuSans-Bold.ttf')
        
        if os.path.exists(regular_font):
            pdfmetrics.registerFont(TTFont('DejaVuSans', regular_font))
            print(f"[Font] ✅ Registered DejaVuSans from: {regular_font}")
        else:
            print(f"[Font] ❌ DejaVuSans.ttf not found at: {regular_font}")
            return "Helvetica", "Helvetica-Bold"
        
        if os.path.exists(bold_font):
            pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', bold_font))
            print(f"[Font] ✅ Registered DejaVuSans-Bold from: {bold_font}")
        else:
            print(f"[Font] ⚠️ DejaVuSans-Bold.ttf not found, using regular for bold")
            return "DejaVuSans", "DejaVuSans"
        
        return "DejaVuSans", "DejaVuSans-Bold"
        
    except Exception as e:
        print(f"[Font] ❌ Error registering fonts: {e}")
        import traceback
        traceback.print_exc()
        return "Helvetica", "Helvetica-Bold"

font_name, font_bold = register_fonts()


class OMRPDFViewSet(viewsets.ViewSet):
    """✅ ViewSet CHỈ PHỤC VỤ GENERATE PDF cho Paper Test"""
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'], url_path='generate-full-test-pdf')
    def generate_full_test_pdf(self, request):
        """✅ Generate PDF với chú thích cho câu nhiều đáp án"""
        try:
            test_name = request.data.get('title', 'ĐỀ KIỂM TRA')
            num_choices = int(request.data.get('num_choices', 4))
            question_ids = request.data.get('questions', [])
            
            # ✅ LẤY TẤT CẢ CÂU MC
            questions = Question.objects.filter(
                id__in=question_ids,
                question_type='MC'
            ).prefetch_related('options')
            
            if not questions.exists():
                return Response(
                    {"error": "Không có câu hỏi Multiple Choice nào được chọn."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            questions_dict = {q.id: q for q in questions}
            ordered_questions = [questions_dict[qid] for qid in question_ids if qid in questions_dict]
            num_questions = len(ordered_questions)
            
            if num_questions > 60:
                return Response(
                    {"error": "Số câu hỏi tối đa là 60 câu."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer, 
                pagesize=A4, 
                topMargin=2*cm, 
                bottomMargin=2*cm, 
                leftMargin=2*cm, 
                rightMargin=2*cm
            )
            
            # Styles
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontName=font_bold,
                fontSize=16,
                textColor='black',
                spaceAfter=12,
                alignment=TA_CENTER
            )
            question_style = ParagraphStyle(
                'Question',
                parent=styles['Normal'],
                fontName=font_bold,
                fontSize=12,
                spaceAfter=6,
                leftIndent=0
            )
            option_style = ParagraphStyle(
                'Option',
                parent=styles['Normal'],
                fontName=font_name,
                fontSize=11,
                leftIndent=20,
                spaceAfter=4
            )
            # ✅ THÊM STYLE CHO CHÚ THÍCH
            note_style = ParagraphStyle(
                'Note',
                parent=styles['Normal'],
                fontName=font_bold,
                fontSize=10,
                textColor='purple',
                leftIndent=20,
                spaceAfter=8
            )
            
            story = []
            
            # ========== TRANG 1: TÔ MÀU (OMR SHEET) ==========
            def draw_omr_page(canvas_obj, doc):
                width, height = A4
                margin_x = 1.0 * cm
                margin_y = 1.0 * cm
                marker_size = 0.6 * cm
                
                # Markers (4 góc)
                canvas_obj.setFillColorRGB(0, 0, 0)
                canvas_obj.rect(margin_x, height - margin_y - marker_size, marker_size, marker_size, fill=1)
                canvas_obj.rect(width - margin_x - marker_size, height - margin_y - marker_size, marker_size, marker_size, fill=1)
                canvas_obj.rect(margin_x, margin_y, marker_size, marker_size, fill=1)
                canvas_obj.rect(width - margin_x - marker_size, margin_y, marker_size, marker_size, fill=1)

                # Header
                header_top = height - margin_y - 2.0 * cm
                canvas_obj.setFont(font_bold, 16)
                canvas_obj.drawCentredString(width/2, header_top + 1.0*cm, test_name.upper())
                
                canvas_obj.setFont(font_name, 11)
                canvas_obj.drawString(margin_x + 1.5*cm, header_top, "Tên: __________________________________________________  Ngày: ____/____")
                canvas_obj.drawString(margin_x + 1.5*cm, header_top - 0.9*cm, "Lớp: _______________________  Mã đề: ________________________")

                # Vẽ OMR bubbles
                q_start_y = header_top - 2.5 * cm
                q_start_x = margin_x + 1.5 * cm
                
                QUESTIONS_PER_COL = 10
                COLS_PER_ROW = 3
                
                bubble_radius = 0.22 * cm
                col_width = 5.5 * cm
                row_height = 8.0 * cm
                line_spacing = 0.65 * cm
                choice_spacing = 0.7 * cm
                
                for q_num in range(1, num_questions + 1):
                    global_idx = q_num - 1
                    col_idx = (global_idx // QUESTIONS_PER_COL) % COLS_PER_ROW
                    row_block_idx = (global_idx // QUESTIONS_PER_COL) // COLS_PER_ROW
                    row_in_col = global_idx % QUESTIONS_PER_COL
                    
                    x_base = q_start_x + (col_idx * col_width)
                    y_base = q_start_y - (row_block_idx * row_height) - (row_in_col * line_spacing)
                    
                    canvas_obj.setFont(font_bold, 11)
                    canvas_obj.drawString(x_base, y_base - 0.15*cm, str(q_num) + ".")
                    
                    canvas_obj.setFont(font_name, 9)
                    for i in range(num_choices):
                        choice_char = chr(65 + i)
                        x_choice = x_base + 0.8*cm + (i * choice_spacing)
                        canvas_obj.setLineWidth(1.2)
                        canvas_obj.circle(x_choice, y_base, bubble_radius)
                        canvas_obj.drawCentredString(x_choice, y_base - 0.12*cm, choice_char)
            
            # Tạo trang OMR
            story.append(Spacer(1, 0))
            story.append(PageBreak())
            
            # ========== CÁC TRANG TIẾP THEO: CÂU HỎI ==========
            story.append(Paragraph(test_name.upper(), title_style))
            story.append(Spacer(1, 0.5*cm))
            
            for idx, question in enumerate(ordered_questions, start=1):
                # Escape HTML
                question_text = question.prompt.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                question_para = f"<b>Câu {idx}:</b> {question_text}"
                story.append(Paragraph(question_para, question_style))
                
                # ✅ KIỂM TRA NHIỀU ĐÁP ÁN
                correct_count = question.options.filter(is_correct_bool=True).count()
                if correct_count > 1:
                    note_para = f"<i>* This question has {correct_count} correct answers</i>"
                    story.append(Paragraph(note_para, note_style))
                
                # Các đáp án
                options = question.options.all().order_by('order')
                for opt in options:
                    option_letter = chr(65 + opt.order)
                    option_text_escaped = opt.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    option_para = f"{option_letter}. {option_text_escaped}"
                    story.append(Paragraph(option_para, option_style))
                
                story.append(Spacer(1, 0.5*cm))
            
            # Build PDF
            def on_first_page(canvas_obj, doc):
                draw_omr_page(canvas_obj, doc)
            
            def on_later_pages(canvas_obj, doc):
                pass
            
            doc.build(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
            
            buffer.seek(0)
            
            return FileResponse(
                buffer, 
                as_attachment=False, 
                filename='full_test.pdf', 
                content_type='application/pdf'
            )

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)