# testgen/api/exam/pdf_utils.py

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
import os

def register_vietnamese_fonts():
    """
    Đăng ký font tiếng Việt từ folder fonts/
    
    Returns:
        tuple: (font_regular_name, font_bold_name)
    """
    # Đường dẫn tới folder fonts (cùng cấp với exam/)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    fonts_dir = os.path.join(base_dir, 'fonts')
    
    try:
        # ✅ ĐĂNG KÝ DejaVuSans (Regular)
        regular_path = os.path.join(fonts_dir, 'DejaVuSans.ttf')
        if os.path.exists(regular_path):
            pdfmetrics.registerFont(TTFont('VNFont', regular_path))
            print(f"✅ Registered: DejaVuSans from {regular_path}")
        else:
            print(f"⚠️ Font not found: {regular_path}")
            return 'Helvetica', 'Helvetica-Bold'
        
        # ✅ ĐĂNG KÝ DejaVuSans-Bold
        bold_path = os.path.join(fonts_dir, 'DejaVuSans-Bold.ttf')
        if os.path.exists(bold_path):
            pdfmetrics.registerFont(TTFont('VNFont-Bold', bold_path))
            print(f"✅ Registered: DejaVuSans-Bold from {bold_path}")
        else:
            print(f"⚠️ Font not found: {bold_path}")
            return 'Helvetica', 'Helvetica-Bold'
        
        # ✅ MAP FONT FAMILY (để p.setFont("VNFont-Bold") tự động tìm đúng)
        addMapping('VNFont', 0, 0, 'VNFont')        # Normal
        addMapping('VNFont', 1, 0, 'VNFont-Bold')   # Bold
        
        return 'VNFont', 'VNFont-Bold'
    
    except Exception as e:
        print(f"❌ Error registering fonts: {e}")
        import traceback
        traceback.print_exc()
        return 'Helvetica', 'Helvetica-Bold'