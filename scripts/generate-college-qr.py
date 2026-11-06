from pathlib import Path
from reportlab.graphics.barcode import qrencoder
from PIL import Image,ImageDraw
import zipfile
import argparse
parser=argparse.ArgumentParser()
parser.add_argument("--origin",default="https://naf-soil-day-2026-student-registration.nationalagro-8017.chatgpt.site")
parser.add_argument("--output")
args=parser.parse_args()

origin=args.origin.rstrip('/')
root=Path(args.output) if args.output else Path(__file__).resolve().parents[1]/'public'/'qr'
root.mkdir(parents=True,exist_ok=True)
colleges=[('srm','SRM Institute of Science and Technology (SRM)'),('vit','Vellore Institute of Technology (VIT)'),('aac','Adhiparaskthi Agricultural and Horticultural College')]
for extension in ['png','svg']:
    (root/f'au-registration.{extension}').unlink(missing_ok=True)
links=[]
for identifier,name in colleges:
    url=origin+'/register/'+identifier+('/' if args.output else '')
    code=qrencoder.QRCode(None,qrencoder.QRErrorCorrectLevel.M)
    code.addData(url);code.make();matrix=code.modules;n=len(matrix);quiet=4;scale=50;size=(n+8)*scale
    image=Image.new('RGB',(size,size),'white');draw=ImageDraw.Draw(image);paths=[]
    for y,row in enumerate(matrix):
        for x,filled in enumerate(row):
            if filled:
                draw.rectangle(((x+quiet)*scale,(y+quiet)*scale,(x+quiet+1)*scale-1,(y+quiet+1)*scale-1),fill='#203e2f')
                paths.append(f'M{x+quiet} {y+quiet}h1v1h-1z')
    image.save(root/f'{identifier}-registration.png',dpi=(300,300))
    (root/f'{identifier}-registration.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="2400" viewBox="0 0 {n+8} {n+8}" shape-rendering="crispEdges"><title>{name} World Soil Day 2026 Registration</title><rect width="100%" height="100%" fill="white"/><path fill="#203e2f" d="'+''.join(paths)+'"/></svg>')
    links.append(name+'\n'+url+'\n')
    print(identifier,str(size)+' x '+str(size),url)
(root/'College_Registration_Links.txt').write_text('NATIONAL AGRO FOUNDATION\nWORLD SOIL DAY 2026 — STUDENT COMPETITIONS\nEvent: 5 December 2026\nRegistration closes: 16 November 2026, 5:00 PM IST\n\n'+'\n'.join(links)+'\nEach QR code opens its own locked college registration link.\nPNG: high-resolution, 300 DPI. SVG: scalable print artwork.\nKeep the white quiet zone around each QR code when printing.\n')
with zipfile.ZipFile(root/'NAF_Three_College_Registration_QR_Codes.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for identifier,_ in colleges:
        for extension in ['png','svg']:archive.write(root/f'{identifier}-registration.{extension}',f'{identifier.upper()}_Registration_QR.{extension}')
    archive.write(root/'College_Registration_Links.txt','College_Registration_Links.txt')
