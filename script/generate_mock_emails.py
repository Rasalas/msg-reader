#!/usr/bin/env python3
import os
import base64
from io import BytesIO
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
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
    <img src="cid:company-logo" style="max-width: 200px;"><br>
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
    emails = [
        # Email 1: Ada's Invoice to Charles
        {
            'from': PERSONAS[0],  # Ada
            'to': PERSONAS[1],    # Charles
            'subject': 'Invoice for Analytical Engine Consulting Services',
            'type': 'invoice',
            'needs_attachments': True
        },
        # Email 2: Turing's Project Update
        {
            'from': PERSONAS[2],  # Turing
            'to': PERSONAS[3],    # Grace
            'subject': 'Progress Update: Universal Computing Machine',
            'type': 'update',
            'needs_attachments': True
        },
        # Email 3: Grace's Bug Report
        {
            'from': PERSONAS[3],  # Grace
            'to': PERSONAS[2],    # Turing
            'subject': 'Found a bug in the compiler - nanoseconds matter!',
            'type': 'bug_report',
            'needs_attachments': False
        },
        # Email 4: Charles' Meeting Minutes
        {
            'from': PERSONAS[1],  # Charles
            'to': PERSONAS[0],    # Ada
            'subject': 'Minutes from yesterday\'s Engine Design Review',
            'type': 'minutes',
            'needs_attachments': False
        }
    ]
    
    for i, email_data in enumerate(emails):
        # Create the basic email structure
        msg = MIMEMultipart()
        msg['Subject'] = email_data['subject']
        msg['From'] = f"{email_data['from']['name']} <{email_data['from']['email']}>"
        msg['To'] = f"{email_data['to']['name']} <{email_data['to']['email']}>"
        msg['Date'] = (datetime.now() - timedelta(days=i)).strftime('%a, %d %b %Y %H:%M:%S +0000')
        msg['Message-ID'] = f"<{random.randint(1000000,9999999)}@{email_data['from']['email'].split('@')[1]}>"

        # Get logo if needed
        logo_data = None
        logo_data = get_company_logo(email_data['from'])

        # Create content based on email type
        if email_data['type'] == 'invoice':
            html = create_invoice_html(email_data['from'], email_data['to'])
            pdf_title = "Invoice Details"
        elif email_data['type'] == 'update':
            html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;">
    <p>Dear {email_data['to']['name']},</p>
    <br>
    <p>I'm pleased to report significant progress on our universal computing machine project. 
    The theoretical framework is now complete, and I've attached the latest specifications.</p>
    <br>
    <p>Key achievements:</p>
    <ul style="margin-left: 20px;">
        <li>Completed the mathematical model for state transitions</li>
        <li>Developed a new notation system for machine instructions</li>
        <li>Solved the halting problem (just kidding!)</li>
    </ul>
    <br>
    <p>Best regards,<br>
    {email_data['from']['name']}<br><br>
    {email_data['from']['position']}<br>
    {email_data['from']['company']}<br>
    <br>
    <img src="cid:company-logo" style="max-width: 200px;"><br></p>
</body>
</html>"""
            pdf_title = "Project Specifications"
        elif email_data['type'] == 'bug_report':
            html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;">
    <p>Dear {email_data['to']['name']},</p>
    <br>
    <p>I've discovered a timing issue in our compiler. It seems we're losing nanoseconds 
    in the instruction processing loop. As I always say, nanoseconds add up!</p>
    <br>
    <p>The issue appears in the main processing loop where we're not properly accounting 
    for the microsecond precision in our timing calculations. This is causing a cumulative 
    delay that becomes significant in longer running processes.</p>
    <br>
    <p style="color: #cc0000;">Priority: High<br>
    Impact: Performance degradation<br>
    Affected Component: Main processing loop</p>
    <br>
    <p>I recommend we schedule a meeting to discuss the implementation details of a fix.</p>
    <br>
    <p>Regards,<br>
    {email_data['from']['name']}<br><br>
    {email_data['from']['position']}<br>
    {email_data['from']['company']}<br>
    <br>
    <img src="cid:company-logo" style="max-width: 200px;"><br>
</p>
</body>
</html>"""
            pdf_title = "Debug Logs"
        else:  # minutes
            html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;">
    <h2>Engine Design Review - Meeting Summary</h2>
    <br>
    <p>Dear {email_data['to']['name']},</p>
    <br>
    <p>Here's a brief summary of yesterday's design review meeting where we discussed 
    the gear ratio calculations.</p>
    <br>
    <p>Key decisions:</p>
    <ul style="margin-left: 20px;">
        <li>Approved the new brass gear specifications</li>
        <li>Scheduled next month's maintenance window</li>
        <li>Allocated budget for additional punch cards</li>
    </ul>
    <br>
    <p>Next meeting scheduled for: {(datetime.now() + timedelta(days=7)).strftime('%B %d, %Y')}</p>
    <br>
    <p>Yours sincerely,<br>
    {email_data['from']['name']}<br><br>
    {email_data['from']['position']}<br>
    {email_data['from']['company']}<br>
    <br>
    <img src="cid:company-logo" style="max-width: 200px;"><br>
</p>
</body>
</html>"""
            pdf_title = "Meeting Minutes"

        # Attach the HTML content
        msg.attach(MIMEText(html, 'html'))

        # Attach logo if available
        if logo_data:
            logo_mime = MIMEImage(logo_data, _subtype='svg+xml')
            logo_mime.add_header('Content-ID', '<company-logo>')
            logo_mime.add_header('Content-Disposition', 'inline')
            msg.attach(logo_mime)

        # Add PDF attachment if needed
        if email_data['needs_attachments']:
            pdf_data = create_sample_pdf(pdf_title)
            pdf_mime = MIMEApplication(pdf_data, _subtype='pdf')
            pdf_mime.add_header('Content-Disposition', 'attachment', 
                               filename=f"{pdf_title.lower().replace(' ', '_')}.pdf")
            msg.attach(pdf_mime)

        # Save the email
        with open(f'doc/eml/mock_email_{i+1}.eml', 'w') as f:
            f.write(msg.as_string())

def main():
    os.makedirs('doc/eml', exist_ok=True)
    generate_mock_emails()

if __name__ == '__main__':
    main() 