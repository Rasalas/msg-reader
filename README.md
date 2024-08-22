# *.msg Reader

My collegue sends me a lot of emails in the *.msg format. It's the format that "Old Microsoft Outlook" uses if you export an email or attach it to another email.  
I couldn't even open these files on my Windows 11 machine, because of an error that stated that I need an active Microsoft 365 subscription - which is confusing (or **very** wrong), because I have one and it's active in all other MS Office apps.

Since my collegue doesn't stop sending me these <3 and my Feedback to Microsoft a few months ago didn't do anything 💤, I decided to take matters into my own hands.  
I wrote a small tool that can read these files and show them to me (about) how they are shown in email clients - with HTML and inline images and all.

I am currently writing with the Microsoft Support to get this issue fixed, but until then, I have this tool (and everyone who needs to open *.msg files and can't/wont afford a Microsoft 365 Subscription to open a fricking .msg-File).  

... also - WHY would you put a paywall in front of a file format that you created?

## Disclaimer
I'm not sure I remember updating this readme file if there are any updates to the Microsoft Support thing or if it suddenly works.  

It's just here to help. :)


## HYPER Quick Start (GitHub Pages)
1. Open [rasalas.github.io/msg-reader/](https://rasalas.github.io/msg-reader/)
2. Drag your file from your file system and drop it in the drop area.
3. Done.  

You should now see your email contents


## Quick Start (locally)
1. Clone the repository
```bash
git clone https://github.com/Rasalas/msg-reader.git
cd msg-reader
```

2. Install the dependencies
```bash
npm install
```

3. Run the application
```bash
npm start
```
A browser window should open with the application running.


## Development
1. Clone the repository
```bash
git clone https://github.com/Rasalas/msg-reader.git
cd msg-reader
```

2. Install the dependencies
```bash
npm install 
```

3. Run the application in development mode
```bash
npm run dev
```

A browser window should open with the application running. The application will automatically reload when changes are made to the source code.

## Other Commands

### Deloy to GitHub Pages
```bash
npm run deploy
```
This will build the application and deploy it to GitHub Pages.

### Watch
```bash
npm run watch
```
This will watch the code for changes and bundle the code using browserify.

### Build

```bash
npm run build
```
This will bundle the code using browserify and output the bundled code to the `dist` directory inside the `bundle.js`.

### Build it brick by brick

Bundle the code the hard way:
```bash
npx browserify src/msgreader.js -o dist/bundle.js
```


## Other links

[SourceForge | MsgViewer](https://sourceforge.net/projects/msgviewer/postdownload)  
Java app. Works, basically my favourite, but doesn't show inline images

[encryptomatic.com | Free Online .msg Viewer](https://www.encryptomatic.com/viewer/)  
Kinda sus. I don't really trust them, because they sell the ~same thing as a [product](https://www.encryptomatic.com/msgviewer/msgviewerpro.html). You also can't see inline images and you get an ad in the end of the email instad of in the page itself.

[GitHub | datenteiler/ReadMsgFile](https://github.com/datenteiler/ReadMsgFile)  
Seems to be ok, but it only shows the text version of the email. No inline images or HTML because it uses a command line interface.

[MS Store | MSG Viewer](https://apps.microsoft.com/detail/9nwsk3187kv3?hl=de-DE&gl=DE)  
Costst money and doesn't look promising.

## "Receipts"
account.microsoft.com account page showing an active subsciption. Next payment 26th March 2025 for 69€
![account.microsoft.com account page showing an active subsciption. Next payment 26th March 2025 for 69€](doc/res/microsoft-accounts-webpage.png)

a table showing payments of the last three years. Last payment of 69€ on 26th March 2024
![a table showing payments of the last three years. Last payment of 69€ on 26th March 2024](doc/res/abrechnungsverlauf.png)

Windows 11 Account page showing an active Microsoft 365 Single subscription
![Windows 11 Account page showing an active Microsoft 365 Single subscription](doc/res/windows-account-page.png)

An error message stating that the msg file can't be opened, because it requires an active subscription
![An error message stating that the msg file can't be opened, because it requires an active subscription](doc/res/new-outlook-error-message.png)

## Possible Improvements
- [ ] allow other file types (like .eml)
- [ ] allow to download the email as a .eml file
- [ ] allow to upload multiple files at once
  - [ ] make drop area fill the whole screen
  - [ ] show a list of all imported emails on the side, like the inbox of an email client 
  - [ ] sort by date
  - [ ] show a preview of the currently selected email
  - [ ] separate subject, recipients & sender, body, attachmentes