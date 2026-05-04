"""
OMR Template Parser v2.1

Parses the grid-based omr_template_XX.json with timing mark support.
All coordinates are in pixels relative to TL marker center after warp.

Template files are stored in omr_templates/ with 5 fixed tiers:
omr_template_20.json, omr_template_40.json, ..., omr_template_100.json
"""

import json
import os


class TemplateValidationError(Exception):
    pass


def load_template(path):
    """Load and validate template from an explicit path."""
    if not os.path.exists(path):
        raise TemplateValidationError(f"Template file not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        template = json.load(f)

    _validate_template(template)
    return template


def load_template_for_test(num_questions):
    """Load the correct tier template for a test with num_questions.

    Uses the same tier logic as PDF generation to ensure synchronization.
    Example: 25 questions -> loads omr_template_40.json
    """
    from .generate_omr_sheet import get_template_path
    path = get_template_path(num_questions)
    return load_template(path)


def get_template_version(template):
    """Return template version string."""
    return template.get("version", "2.0")


# ==============================================================================
# Block API
# ==============================================================================

def get_block(template, block_name):
    """Get a block definition by name."""
    blocks = template.get("blocks", {})
    block = blocks.get(block_name)
    if block is None:
        raise TemplateValidationError(f"Block '{block_name}' not found in template")
    return block


def get_all_answer_blocks(template):
    """Return all answer_grid blocks, ordered by question_start."""
    blocks = template.get("blocks", {})
    answer_blocks = []
    for name, block in blocks.items():
        if block.get("type") == "answer_grid":
            answer_blocks.append((name, block))
    answer_blocks.sort(key=lambda x: x[1].get("question_start", 0))
    return answer_blocks


def get_bubble_positions(block):
    """
    Compute all bubble pixel coordinates from a grid block definition.

    For digit_grid: returns list of (row, col, x, y).
        row = digit value (0-9), col = digit column index.
    For answer_grid: returns list of (row, col, x, y).
        row = question index within block, col = choice index.

    Handles block_gap_y for answer grids (extra gap every block_size rows).
    """
    origin_x = block["origin"]["x"]
    origin_y = block["origin"]["y"]
    cols = block["cols"]
    rows = block["rows"]
    gap_x = block["gap_x"]
    gap_y = block["gap_y"]
    block_size = block.get("block_size", rows)
    block_gap_y = block.get("block_gap_y", 0)

    positions = []
    for r in range(rows):
        num_gaps = r // block_size if block_size > 0 else 0
        y = origin_y + r * gap_y + num_gaps * block_gap_y
        for c in range(cols):
            x = origin_x + c * gap_x
            positions.append((r, c, round(x, 1), round(y, 1)))

    return positions


def get_row_y(block, row_index):
    """Compute the Y coordinate for a specific row in a block."""
    origin_y = block["origin"]["y"]
    gap_y = block["gap_y"]
    block_size = block.get("block_size", block["rows"])
    block_gap_y = block.get("block_gap_y", 0)

    num_gaps = row_index // block_size if block_size > 0 else 0
    return origin_y + row_index * gap_y + num_gaps * block_gap_y


# ==============================================================================
# Timing Marks API
# ==============================================================================

def get_timing_mark_positions(template):
    """Return list of timing mark dicts with {section, row, x, y}."""
    tm = template.get("timing_marks", {})
    return tm.get("positions", [])


def get_timing_mark_dims(template):
    """Return (width_px, height_px) of timing marks."""
    tm = template.get("timing_marks", {})
    return tm.get("mark_width_px", 8), tm.get("mark_height_px", 8)


# ==============================================================================
# Threshold API
# ==============================================================================

def get_threshold(template, block_name, key, default=None):
    """Get threshold value from a block or global thresholds."""
    blocks = template.get("blocks", {})
    block = blocks.get(block_name, {})
    thresholds = block.get("thresholds", {})
    if key in thresholds:
        return thresholds[key]
    return template.get("global_thresholds", {}).get(key, default)


# ==============================================================================
# Validation
# ==============================================================================

def _validate_template(template):
    """Validate v2.0 template structure."""
    if not isinstance(template, dict):
        raise TemplateValidationError("Template root must be an object")

    warp = template.get("target_warp_size")
    if not isinstance(warp, dict) or "width" not in warp or "height" not in warp:
        raise TemplateValidationError("Missing target_warp_size with width/height")

    blocks = template.get("blocks")
    if not isinstance(blocks, dict) or len(blocks) == 0:
        raise TemplateValidationError("Template must contain at least one block")

    for name in ("student_id", "test_id"):
        if name not in blocks:
            raise TemplateValidationError(f"Missing required block: {name}")
        _validate_block(name, blocks[name])

    # At least one answer block
    has_answers = any(b.get("type") == "answer_grid" for b in blocks.values())
    if not has_answers:
        raise TemplateValidationError(
            "Template must contain at least one answer_grid block"
        )


def _validate_block(name, block):
    """Validate a single block definition."""
    required = ("type", "origin", "cols", "rows", "gap_x", "gap_y")
    missing = [k for k in required if k not in block]
    if missing:
        raise TemplateValidationError(
            f"Block '{name}' missing keys: {', '.join(missing)}"
        )

    origin = block["origin"]
    if not isinstance(origin, dict) or "x" not in origin or "y" not in origin:
        raise TemplateValidationError(
            f"Block '{name}' origin must have x and y"
        )
