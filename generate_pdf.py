from fpdf import FPDF
import os

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'Intelligent Wi-Fi Router Placement Optimizer', 0, 1, 'C')
        self.set_font('Arial', 'I', 10)
        self.cell(0, 10, 'Project Report & Demonstration', 0, 1, 'C')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

    def chapter_title(self, num, label):
        self.set_font('Arial', 'B', 12)
        self.set_fill_color(200, 220, 255)
        self.cell(0, 6, f'{num}. {label}', 0, 1, 'L', 1)
        self.ln(4)

    def chapter_body(self, body):
        self.set_font('Arial', '', 11)
        self.multi_cell(0, 6, body)
        self.ln()

    def bullet_point(self, text):
        self.set_font('Arial', '', 11)
        self.cell(10)
        self.cell(0, 6, f'- {text}', 0, 1)

def create_pdf():
    pdf = PDF()
    pdf.add_page()
    
    # 1. Overview
    pdf.chapter_title(1, 'Project Overview')
    pdf.chapter_body(
        "This project is a scientific web application designed to optimize Wi-Fi router placement "
        "within an indoor environment. By simulating Radio Frequency (RF) propagation, "
        "it helps users identify maximum coverage areas and dead zones."
    )
    
    # 2. How Everything Works
    pdf.chapter_title(2, 'How It Works (Architecture)')
    pdf.chapter_body(
        "The application follows a Client-Side Architecture, meaning it requires no backend server. "
        "All calculations and rendering happen directly in the user's browser for maximum performance and privacy."
    )
    pdf.bullet_point("Frontend: HTML5, CSS3, JavaScript (ES6+)")
    pdf.bullet_point("Rendering: HTML5 Canvas API (for high-performance pixel manipulation)")
    pdf.bullet_point("Physics Engine: Custom JavaScript implementation of RF models")
    pdf.ln()

    # 3. Mathematical Concepts
    pdf.chapter_title(3, 'Mathematical Concepts')
    pdf.chapter_body(
        "The core physics is based on the One-Slope Log-Normal Path Loss Model, "
        "the standard for indoor environment RF simulation."
    )
    
    pdf.set_font('Courier', '', 11)
    pdf.set_fill_color(240, 240, 240)
    pdf.multi_cell(0, 8, "RSSI = Ptx - L0 - 10 * n * log10(d) - Wall_Losses", 0, 'L', True)
    pdf.ln(2)
    pdf.set_font('Arial', '', 11)
    
    pdf.bullet_point("RSSI: Received Signal Strength Indicator (dBm)")
    pdf.bullet_point("Ptx: Transmit Power (e.g., 20 dBm)")
    pdf.bullet_point("n: Path Loss Exponent (decay rate over distance)")
    pdf.bullet_point("d: Euclidean Distance (calculated using Pythagorean theorem)")
    pdf.bullet_point("Wall_Losses: Accumulated attenuation from obstacles (Ray Casting)")
    pdf.ln()

    pdf.chapter_body(
        "Ray Casting is used to detect walls. A virtual line is drawn from the router to every specific "
        "point on the grid. If this line intersects a wall, the signal strength is reduced by that wall's "
        "attenuation factor (e.g., 12dB for concrete, 6dB for wood)."
    )

    # 4. Demonstration Guide
    pdf.chapter_title(4, 'Demonstration (Walkthrough)')
    pdf.chapter_body(
        "Follow these steps to demonstrate the application's capabilities:"
    )
    
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 8, "Step 1: Design the Floor Plan", 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.multi_cell(0, 6, 
        "Use the sidebar tools to draw the room layout. Select the 'Wall' tool and drag on the canvas. "
        "You can adjust wall thickness using the configuration panel to simulate concrete vs. drywall."
    )
    pdf.ln(2)

    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 8, "Step 2: Place the Router", 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.multi_cell(0, 6, 
        "Select the 'Router' tool and click anywhere in the room. The system will instantly compute "
        "and render the signal heatmap. Red areas indicate strong signal, while blue areas show dead zones."
    )
    pdf.ln(2)

    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 8, "Step 3: Analyze Coverage", 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.multi_cell(0, 6, 
        "Check the stats panel for 'Coverage %'. Move the router around to see real-time updates. "
        "Notice how the signal drops significantly behind thick walls."
    )
    pdf.ln(2)

    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 8, "Step 4: Auto-Optimization (AI)", 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.multi_cell(0, 6, 
        "Click the 'Auto-Optimize' button. The system runs a grid-search heuristic, testing thousands of "
        "positions to mathematically find the best location that maximizes coverage."
    )
    pdf.ln(4)

    pdf.output("Wifi_Optimizer_Report.pdf")

if __name__ == "__main__":
    create_pdf()
