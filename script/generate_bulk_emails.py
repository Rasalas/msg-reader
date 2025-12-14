#!/usr/bin/env python3
"""Generate bulk mock email files for testing purposes."""

import os
import sys
import random
import argparse
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from datetime import datetime, timedelta
from io import BytesIO

PERSONAS = [
    {'name': 'Ada Lovelace', 'email': 'ada.lovelace@analyticalengine.co.uk'},
    {'name': 'Charles Babbage', 'email': 'charles.babbage@differencemachine.co.uk'},
    {'name': 'Alan Turing', 'email': 'alan.turing@enigma.gov.uk'},
    {'name': 'Grace Hopper', 'email': 'grace.hopper@cobol.mil'},
    {'name': 'Linus Torvalds', 'email': 'linus@linux-foundation.org'},
    {'name': 'Tim Berners-Lee', 'email': 'timbl@w3c.org'},
    {'name': 'Margaret Hamilton', 'email': 'margaret@nasa.gov'},
    {'name': 'Dennis Ritchie', 'email': 'dmr@bell-labs.com'},
    {'name': 'Ken Thompson', 'email': 'ken@bell-labs.com'},
    {'name': 'Bjarne Stroustrup', 'email': 'bjarne@cpp.org'},
]

SUBJECTS = [
    'Re: Code Review Request',
    'Meeting Notes from {date}',
    'Bug Report: Issue #{num}',
    'Feature Request: {feature}',
    'Weekly Status Update',
    'Question about implementation',
    'Urgent: Production issue',
    'Documentation update needed',
    'Test results for build #{num}',
    'Patch for security vulnerability',
    'Design proposal for new module',
    'Performance optimization results',
    'API changes discussion',
    'Deployment scheduled for {date}',
    'Release notes v{version}',
]

FEATURES = ['dark mode', 'export function', 'user dashboard', 'API v2', 'authentication']

BODY_TEMPLATES = [
    "Hi {recipient},\n\nI wanted to follow up on our previous discussion.\n\nBest,\n{sender}",
    "Dear {recipient},\n\nPlease find the attached document.\n\nRegards,\n{sender}",
    "{recipient},\n\nCan you review this when you get a chance?\n\nThanks,\n{sender}",
    "Hello {recipient},\n\nJust a quick update on the project status.\n\n- Task 1: Complete\n- Task 2: In Progress\n- Task 3: Pending\n\nBest regards,\n{sender}",
    "Hi {recipient},\n\nI found an issue that needs attention.\n\nDetails:\n- Component: Main module\n- Severity: Medium\n- Steps to reproduce: See attachment\n\nLet me know if you need more info.\n\n{sender}",
]


def create_sample_image(width=100, height=100, color='blue'):
    """Create a simple colored rectangle as PNG"""
    try:
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (width, height), color='white')
        draw = ImageDraw.Draw(img)
        draw.rectangle([10, 10, width-10, height-10], fill=color)
        return img
    except ImportError:
        return None


def create_sample_pdf(title="Document"):
    """Create a simple PDF file"""
    try:
        from reportlab.pdfgen import canvas
        buffer = BytesIO()
        c = canvas.Canvas(buffer)
        c.drawString(100, 750, title)
        c.drawString(100, 730, f"Generated: {datetime.now().strftime('%Y-%m-%d')}")
        c.save()
        return buffer.getvalue()
    except ImportError:
        return None


def generate_subject():
    """Generate a random subject line."""
    template = random.choice(SUBJECTS)
    return template.format(
        date=(datetime.now() - timedelta(days=random.randint(0, 30))).strftime('%Y-%m-%d'),
        num=random.randint(100, 9999),
        feature=random.choice(FEATURES),
        version=f"{random.randint(1,5)}.{random.randint(0,9)}.{random.randint(0,9)}"
    )


def generate_email(index, add_attachments=True):
    """Generate a single mock email."""
    sender = random.choice(PERSONAS)
    recipient = random.choice([p for p in PERSONAS if p != sender])

    msg = MIMEMultipart()
    msg['Subject'] = generate_subject()
    msg['From'] = f"{sender['name']} <{sender['email']}>"
    msg['To'] = f"{recipient['name']} <{recipient['email']}>"
    msg['Date'] = (datetime.now() - timedelta(
        days=random.randint(0, 365),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59)
    )).strftime('%a, %d %b %Y %H:%M:%S +0000')
    msg['Message-ID'] = f"<{random.randint(1000000, 9999999)}.{index}@{sender['email'].split('@')[1]}>"

    # Body
    body_template = random.choice(BODY_TEMPLATES)
    body = body_template.format(
        sender=sender['name'].split()[0],
        recipient=recipient['name'].split()[0]
    )

    # Randomly choose plain text or HTML
    if random.random() > 0.5:
        html_body = f"""<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
<p>{body.replace(chr(10), '<br>')}</p>
</body>
</html>"""
        msg.attach(MIMEText(html_body, 'html'))
    else:
        msg.attach(MIMEText(body, 'plain'))

    # Randomly add attachments
    if add_attachments and random.random() > 0.7:
        # Try to add PDF
        pdf_data = create_sample_pdf(f"Document_{index}")
        if pdf_data:
            pdf_att = MIMEApplication(pdf_data, _subtype='pdf')
            pdf_att.add_header('Content-Disposition', 'attachment', filename=f'document_{index}.pdf')
            msg.attach(pdf_att)

        # Try to add image
        if random.random() > 0.5:
            img = create_sample_image(100, 100, random.choice(['red', 'blue', 'green']))
            if img:
                img_buffer = BytesIO()
                img.save(img_buffer, format='PNG')
                img_att = MIMEImage(img_buffer.getvalue(), _subtype='png')
                img_att.add_header('Content-Disposition', 'attachment', filename=f'image_{index}.png')
                msg.attach(img_att)

    return msg


def main():
    parser = argparse.ArgumentParser(description='Generate bulk mock email files')
    parser.add_argument('count', type=int, help='Number of emails to generate')
    parser.add_argument('--format', choices=['eml', 'both'], default='eml',
                        help='Output format (eml only or both eml and msg stub)')
    parser.add_argument('--output', default='doc/eml/bulk',
                        help='Output directory (default: doc/eml/bulk)')
    parser.add_argument('--no-attachments', action='store_true',
                        help='Do not add random attachments')
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    print(f"Generating {args.count} mock email(s) in {args.output}...")

    for i in range(1, args.count + 1):
        msg = generate_email(i, add_attachments=not args.no_attachments)

        # Write EML file
        eml_path = os.path.join(args.output, f'bulk_email_{i:04d}.eml')
        with open(eml_path, 'w') as f:
            f.write(msg.as_string())

        if (i % 10 == 0) or i == args.count:
            print(f"  Generated {i}/{args.count} emails...")

    print(f"Done! Generated {args.count} email(s) in {args.output}")


if __name__ == '__main__':
    main()
