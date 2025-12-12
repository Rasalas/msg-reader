#!/usr/bin/env python3
import os
import base64
from io import BytesIO
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.message import MIMEMessage
from email.mime.application import MIMEApplication
from datetime import datetime, timedelta
import random

PERSONAS = [
    {
        'name': 'Ada Lovelace',
        'email': 'ada.lovelace@analyticalengine.co.uk',
        'company': 'Analytical Engine Solutions Ltd.',
        'position': 'Chief Algorithm Officer'
    },
    {
        'name': 'Charles Babbage',
        'email': 'charles.babbage@differencemachine.co.uk',
        'company': 'Difference Engine Works',
        'position': 'Chief Engineer'
    },
    {
        'name': 'Alan Turing',
        'email': 'alan.turing@enigma.gov.uk',
        'company': 'Bletchley Park Research',
        'position': 'Head of Cryptography'
    },
    {
        'name': 'Grace Hopper',
        'email': 'grace.hopper@cobol.mil',
        'company': 'COBOL Systems Inc.',
        'position': 'Director of Compiler Development'
    },
    {
        'name': 'Linus Torvalds',
        'email': 'linus@linux-foundation.org',
        'company': 'Linux Foundation',
        'position': 'Benevolent Dictator for Life'
    },
    {
        'name': 'Tim Berners-Lee',
        'email': 'timbl@w3c.org',
        'company': 'World Wide Web Consortium',
        'position': 'Director'
    },
    {
        'name': 'Margaret Hamilton',
        'email': 'margaret@nasa.gov',
        'company': 'NASA',
        'position': 'Lead Apollo Flight Software'
    }
]

def format_currency(amount):
    return f"£{amount:,.2f}"

def create_invoice_html(from_persona, to_persona):
    invoice_number = f"INV-{random.randint(1000, 9999)}"
    items = [
        {
            'description': 'Analytical Engine Consultation',
            'quantity': 5,
            'rate': 150.0,
            'amount': 750.0
        },
        {
            'description': 'Algorithm Development',
            'quantity': 3,
            'rate': 200.0,
            'amount': 600.0
        },
        {
            'description': 'Punch Card Programming',
            'quantity': 10,
            'rate': 75.0,
            'amount': 750.0
        }
    ]
    total = sum(item['amount'] for item in items)
    
    items_html = ""
    for item in items:
        items_html += f"""
            <tr>
                <td style="padding: 10px; border-top: 1px solid #ddd;">{item['description']}</td>
                <td style="padding: 10px; border-top: 1px solid #ddd; text-align: right;">{item['quantity']}</td>
                <td style="padding: 10px; border-top: 1px solid #ddd; text-align: right;">{format_currency(item['rate'])}</td>
                <td style="padding: 10px; border-top: 1px solid #ddd; text-align: right;">{format_currency(item['amount'])}</td>
            </tr>"""

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;">
    <img src="cid:company-logo" style="max-width: 400px;"><br>
    <div style="text-align: right;">
        <h2>{from_persona['company']}</h2>
        <p>Invoice #{invoice_number}</p>
        <p>Date: {datetime.now().strftime('%B %d, %Y')}</p>
    </div>
    
    <div style="margin: 40px 0;">
        <strong>Bill To:</strong><br>
        {to_persona['name']}<br>
        {to_persona['position']}<br>
        {to_persona['company']}<br>
        {to_persona['email']}
    </div>

    <table style="width: 100%; border-collapse: collapse;">
        <tr style="background-color: #f8f8f8;">
            <th style="padding: 10px; text-align: left;">Description</th>
            <th style="padding: 10px; text-align: right;">Quantity</th>
            <th style="padding: 10px; text-align: right;">Rate</th>
            <th style="padding: 10px; text-align: right;">Amount</th>
        </tr>
        {items_html}
        <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 10px; text-align: right;"><strong>{format_currency(total)}</strong></td>
        </tr>
    </table>

    <div style="margin-top: 40px;">
        <p><strong>Payment Terms:</strong> Net 30</p>
        <p><strong>Bank Details:</strong><br>
        Bank: Royal Bank of Mathematics<br>
        Account: 1815-1852<br>
        Sort Code: 18-52-18</p>
    </div>
</body>
</html>"""

def create_sample_image(width=100, height=100, color='blue'):
    """Create a simple colored rectangle as PNG"""
    from PIL import Image, ImageDraw
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, width-10, height-10], fill=color)
    return img

def get_company_logo(persona):
    """Get the company logo for a persona"""
    if persona['name'] == 'Ada Lovelace':
        logo_path = 'doc/res/logos/aes_logo.svg'
    elif persona['name'] == 'Alan Turing':
        logo_path = 'doc/res/logos/bpr_logo.svg'
    elif persona['name'] == 'Charles Babbage':
        logo_path = 'doc/res/logos/dew_logo.svg'
    elif persona['name'] == 'Grace Hopper':
        logo_path = 'doc/res/logos/csi_logo.svg'
    elif persona['name'] == 'Linus Torvalds':
        logo_path = 'doc/res/logos/linux_logo.svg'
    elif persona['name'] == 'Tim Berners-Lee':
        logo_path = 'doc/res/logos/w3c_logo.svg'
    elif persona['name'] == 'Margaret Hamilton':
        logo_path = 'doc/res/logos/nasa_logo.svg'
    else:
        return None
        
    try:
        with open(logo_path, 'rb') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading logo: {e}")
        return None

def create_sample_pdf(title="Meeting Minutes"):
    """Create a simple PDF file"""
    from reportlab.pdfgen import canvas
    from io import BytesIO
    buffer = BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(100, 750, title)
    c.drawString(100, 730, "Generated: " + datetime.now().strftime("%Y-%m-%d"))
    c.save()
    return buffer.getvalue()

def generate_mock_emails():
    # Helper to generate basic parts
    def create_base_msg(sender, recipient, subject, date_offset=0):
        msg = MIMEMultipart()
        msg['Subject'] = subject
        msg['From'] = f"{sender['name']} <{sender['email']}>"
        msg['To'] = f"{recipient['name']} <{recipient['email']}>"
        msg['Date'] = (datetime.now() - timedelta(days=date_offset)).strftime('%a, %d %b %Y %H:%M:%S +0000')
        msg['Message-ID'] = f"<{random.randint(1000000,9999999)}@{sender['email'].split('@')[1]}>"
        return msg

    emails_to_generate = []

    # 1. Existing Standard Emails (Invoice, Update, Bug Report, Minutes)
    # ... (Re-implementing these slightly more compactly to fit in the loop or keeping them as specific cases)
    # For simplicity, I'll add them to a list of defining dicts/functions.

    # -------------------------------------------------------------------------
    # Scenario A: Multipart/Related & Inline CID (Tim BL)
    # -------------------------------------------------------------------------
    # Tim BL sending a draft of the first website.
    def scenario_a():
        msg = MIMEMultipart('related')
        msg['Subject'] = 'First Draft: HyperText Project'
        msg['From'] = f"{PERSONAS[5]['name']} <{PERSONAS[5]['email']}>" # Tim
        msg['To'] = f"{PERSONAS[4]['name']} <{PERSONAS[4]['email']}>"   # Linus
        msg['Date'] = (datetime.now() - timedelta(hours=2)).strftime('%a, %d %b %Y %H:%M:%S +0000')
        msg['Message-ID'] = f"<related-{random.randint(1000,9999)}@w3c.org>"

        html = f"""<html><body>
            <p>Linus,</p>
            <p>I've been working on this idea for information management. I call it the "Mesh" or maybe "World Wide Web".</p>
            <p>Here is the proposed logo:</p>
            <img src="cid:w3c-logo" alt="W3C Logo" width="300">
            <p>Let me know what you think about the tags.</p>
            <p>Cheers,<br>Tim</p>
        </body></html>"""
        
        msg_alt = MIMEMultipart('alternative')
        msg.attach(msg_alt)
        msg_alt.attach(MIMEText(html, 'html'))

        # Attach Inline Image
        logo_data = get_company_logo(PERSONAS[5]) # Tim
        if logo_data:
            img = MIMEImage(logo_data, _subtype='svg+xml')
            img.add_header('Content-ID', '<w3c-logo>')
            img.add_header('Content-Disposition', 'inline', filename='w3c_logo.svg')
            msg.attach(img)
        
        return 'mock_email_scenario_a_related.eml', msg

    # -------------------------------------------------------------------------
    # Scenario B: Whitespace Suffix Handling (Linus)
    # -------------------------------------------------------------------------
    # Linus sending a patch with a trailing space in filename.
    def scenario_b():
        sender = PERSONAS[4] # Linus
        recipient = PERSONAS[5] # Tim
        msg = create_base_msg(sender, recipient, "Kernel Panic on 386 - Patch Enclosed")
        
        body = "Tim,\n\nYour browser crashes the kernel on my new 386 machine. \n\nSee attached patch. \n\n- Linus"
        msg.attach(MIMEText(body, 'plain'))

        # Add Logo
        logo_data = get_company_logo(sender)
        if logo_data:
            img = MIMEImage(logo_data, _subtype='svg+xml')
            img.add_header('Content-ID', '<linux-logo>')
            img.add_header('Content-Disposition', 'inline', filename='linux_logo.svg')
            msg.attach(img)

        # Attachment with whitespace
        patch_content = "diff --git a/kernel/sched.c b/kernel/sched.c\nindex 8b4f... 9c3a...\n--- a/kernel/sched.c\n+++ b/kernel/sched.c\n@@ -1 +1 @@\n- void schedule();\n+ void schedule(void);"
        att = MIMEText(patch_content, _subtype='x-diff')
        # NOTE: Intentionally adding a space at the end of the filename
        att.add_header('Content-Disposition', 'attachment', filename='panic_fix.diff ') 
        msg.attach(att)

        return 'mock_email_scenario_b_whitespace.eml', msg

    # -------------------------------------------------------------------------
    # Scenario C: Base64 Data URI (Margaret)
    # -------------------------------------------------------------------------
    # Margaret sending Apollo code with embedded Base64 image.
    def scenario_c():
        sender = PERSONAS[6] # Margaret
        recipient = PERSONAS[0] # Ada
        msg = create_base_msg(sender, recipient, "LGC Program 1202 Alarm Analysis")

        # Create a tiny PNG for the Base64 URI (red dot)
        img = create_sample_image(20, 20, 'red')
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        html = f"""<html><body>
            <p>Ada,</p>
            <p>We are seeing some 1202 alarms during simulation.</p>
            <p>Status Indicator: <img src="data:image/png;base64,{img_str}" /> (Red means overload)</p>
            <p>I believe it's the rendezvous radar switch position.</p>
            <pre>
            TC      INTRP
            TCF     P06
            </pre>
            <p>- Margaret</p>
            <br>
            <img src="cid:nasa-logo" width="300">
        </body></html>"""
        msg.attach(MIMEText(html, 'html'))

        # Add Logo
        logo_data = get_company_logo(sender)
        if logo_data:
            img = MIMEImage(logo_data, _subtype='svg+xml')
            img.add_header('Content-ID', '<nasa-logo>')
            img.add_header('Content-Disposition', 'inline', filename='nasa_logo.svg')
            msg.attach(img)

        return 'mock_email_scenario_c_base64.eml', msg

    # -------------------------------------------------------------------------
    # Scenario D: Deeply Nested Multipart (Chain)
    # -------------------------------------------------------------------------
    def scenario_d():
        # A chain of Fwd: Fwd: Fwd:
        # Original
        m1 = MIMEMultipart()
        m1['Subject'] = "The original joke"
        m1.attach(MIMEText("Why do programmers mix up Halloween and Christmas? Because Oct 31 == Dec 25.", 'plain'))
        
        # Fwd 1
        m2 = MIMEMultipart()
        m2.attach(MIMEText("Forwarding this...\n\n", 'plain'))
        m2.attach(MIMEMessage(m1))

        # Fwd 2
        m3 = MIMEMultipart()
        sender = PERSONAS[1] # Charles
        m3['Subject'] = "Fwd: Fwd: The original joke"
        m3['From'] = f"{sender['name']} <{sender['email']}>"
        m3['To'] = f"{PERSONAS[2]['name']} <{PERSONAS[2]['email']}>"
        m3['Date'] = datetime.now().strftime('%a, %d %b %Y %H:%M:%S +0000')
        m3.attach(MIMEText("Have you seen this?\n\n", 'plain'))
        m3.attach(MIMEMessage(m2))

        # Add Logo to the top level message (m3)
        logo_data = get_company_logo(sender)
        if logo_data:
            img = MIMEImage(logo_data, _subtype='svg+xml')
            img.add_header('Content-ID', '<dew-logo>')
            img.add_header('Content-Disposition', 'inline', filename='dew_logo.svg')
            m3.attach(img)

        return 'mock_email_scenario_d_nested.eml', m3

    # -------------------------------------------------------------------------
    # Scenario E: Mixed Inline/Attachment
    # -------------------------------------------------------------------------
    # An email with both a CID inline image and a regular attachment.
    def scenario_e():
        sender = PERSONAS[6] # Margaret
        recipient = PERSONAS[3] # Grace
        msg = MIMEMultipart('mixed')
        msg['Subject'] = "Flight Plan & Signature Test"
        msg['From'] = f"{sender['name']} <{sender['email']}>"
        msg['To'] = f"{recipient['name']} <{recipient['email']}>"
        msg['Date'] = datetime.now().strftime('%a, %d %b %Y %H:%M:%S +0000')

        # Related part for body + inline signature
        msg_related = MIMEMultipart('related')
        msg.attach(msg_related)

        html = """<html><body>
            <p>Grace,</p>
            <p>Attached is the flight plan for the next simulation.</p>
            <p>Best,</p>
            <img src="cid:nasa-logo" width="150"><br>
            Margaret
        </body></html>"""
        msg_related.attach(MIMEText(html, 'html'))

        # Inline Logo (CID)
        logo_data = get_company_logo(sender)
        if logo_data:
            img = MIMEImage(logo_data, _subtype='svg+xml')
            img.add_header('Content-ID', '<nasa-logo>')
            img.add_header('Content-Disposition', 'inline', filename='nasa_logo.svg')
            msg_related.attach(img)

        # Regular Attachment
        pdf_data = create_sample_pdf("Flight Plan Delta")
        pdf_att = MIMEApplication(pdf_data, _subtype='pdf')
        pdf_att.add_header('Content-Disposition', 'attachment', filename='flight_plan.pdf')
        msg.attach(pdf_att)

        return 'mock_email_scenario_e_mixed.eml', msg

    # Collect all generators
    emails_to_generate.extend([
        scenario_a(),
        scenario_b(),
        scenario_c(),
        scenario_d(),
        scenario_e()
    ])

    # Add the original 4 basic scenarios back (modified to use create_base_msg for consistency if desired, 
    # but for minimizing code changes we can just rebuild the loop or keep the original structure inside valid functions)
    # To keep the file clean, let's just re-instantiate the first 4 loop logic here.
    
    original_scenarios = [
        (PERSONAS[0], PERSONAS[1], 'Invoice for Analytical Engine Consulting Services', 'invoice', True, 'mock_email_1.eml'),
        (PERSONAS[2], PERSONAS[3], 'Progress Update: Universal Computing Machine', 'update', True, 'mock_email_2.eml'),
        (PERSONAS[3], PERSONAS[2], 'Found a bug in the compiler - nanoseconds matter!', 'bug_report', False, 'mock_email_3.eml'),
        (PERSONAS[1], PERSONAS[0], 'Minutes from yesterday\'s Engine Design Review', 'minutes', False, 'mock_email_4.eml')
    ]

    for i, (p_from, p_to, subj, type, needs_att, filename) in enumerate(original_scenarios):
        msg = MIMEMultipart()
        msg['Subject'] = subj
        msg['From'] = f"{p_from['name']} <{p_from['email']}>"
        msg['To'] = f"{p_to['name']} <{p_to['email']}>"
        msg['Date'] = (datetime.now() - timedelta(days=i)).strftime('%a, %d %b %Y %H:%M:%S +0000')
        msg['Message-ID'] = f"<{random.randint(1000000,9999999)}@{p_from['email'].split('@')[1]}>"

        logo_data = get_company_logo(p_from)
        
        # HTML Content
        if type == 'invoice':
            html = create_invoice_html(p_from, p_to)
            pdf_title = "Invoice Details"
        elif type == 'update':
            html = f"""<!DOCTYPE html><html><body style="font-family: Arial; padding: 20px;">
                <p>Dear {p_to['name']},</p><p>Significant progress on universal computing.</p>
                <img src="cid:company-logo" style="max-width: 200px;"></body></html>"""
            pdf_title = "Project Specifications"
        elif type == 'bug_report':
            html = f"""<!DOCTYPE html><html><body style="font-family: Arial; padding: 20px;">
                <p>Dear {p_to['name']},</p><p>Found a bug in the compiler.</p>
                <img src="cid:company-logo" style="max-width: 200px;"></body></html>"""
            pdf_title = "Debug Logs"
        else: # minutes
            html = f"""<!DOCTYPE html><html><body style="font-family: Arial; padding: 20px;">
                <h2>Meeting Summary</h2><p>Dear {p_to['name']},</p>
                <img src="cid:company-logo" style="max-width: 200px;"></body></html>"""
            pdf_title = "Meeting Minutes"

        msg.attach(MIMEText(html, 'html'))

        if logo_data:
            logo_mime = MIMEImage(logo_data, _subtype='svg+xml')
            logo_mime.add_header('Content-ID', '<company-logo>')
            logo_mime.add_header('Content-Disposition', 'inline', filename='company_logo.svg')
            msg.attach(logo_mime)

        if needs_att:
            pdf_data = create_sample_pdf(pdf_title)
            pdf_mime = MIMEApplication(pdf_data, _subtype='pdf')
            pdf_mime.add_header('Content-Disposition', 'attachment', filename=f"{pdf_title.lower().replace(' ', '_')}.pdf")
            msg.attach(pdf_mime)
            
        emails_to_generate.append((filename, msg))

    # Write all files
    for filename, msg in emails_to_generate:
        with open(f'doc/eml/{filename}', 'w') as f:
            f.write(msg.as_string())
        print(f"Generated {filename}")
def main():
    os.makedirs('doc/eml', exist_ok=True)
    generate_mock_emails()

if __name__ == '__main__':
    main() 