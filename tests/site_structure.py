from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
from collections import Counter
import json
r=Path(__file__).resolve().parents[1]
class P(HTMLParser):
 def __init__(self):super().__init__();self.refs=[];self.img=[];self.ids=[];self.h1=0
 def handle_starttag(self,t,a):
  d=dict(a)
  if d.get('id'):self.ids.append(d['id'])
  if t=='h1':self.h1+=1
  if t=='img':self.img.append(d)
  for k in ['href','src']:
   if d.get(k):self.refs.append((t,d[k]))
files=list(r.glob('*.html'))+list((r/'en').glob('*.html'))+list((r/'hr').glob('*.html'))
parsed={}
for p in files:
 d=P();d.feed(p.read_text());parsed[p]=d
broken=[];anchors=[]
for p,d in parsed.items():
 for tag,url in d.refs:
  u=urlsplit(url)
  if u.scheme or u.netloc:continue
  q=(p.parent/unquote(u.path)).resolve() if u.path else p
  if q.is_dir():q=q/'index.html'
  if not q.exists():broken.append((str(p.relative_to(r)),url))
  elif u.fragment and q in parsed and u.fragment not in parsed[q].ids:anchors.append((str(p.relative_to(r)),url))
print('PAGES',len(files),'BROKEN',broken,'BAD_ANCHORS',anchors)
for p in [r/'index.html',r/'portfolio.html',r/'bau-handwerk.html']:
 d=parsed[p]; total=0
 for i in d.img:
  q=p.parent/urlsplit(i.get('src','')).path
  if q.is_file():total+=q.stat().st_size
 print('IMAGE_BUDGET',p.name,round(total/1024/1024,2),'MB','images',len(d.img),'srcsets',sum('srcset' in x for x in d.img),'missing_dimensions',sum(not('width' in x and 'height' in x) for x in d.img))
print('MISSING_ALT',[(str(p.relative_to(r)),x.get('src')) for p,d in parsed.items() for x in d.img if 'alt' not in x])
print('H1_ISSUES',[(str(p.relative_to(r)),d.h1) for p,d in parsed.items() if d.h1!=1])
print('DUPLICATE_IDS',[(str(p.relative_to(r)),k) for p,d in parsed.items() for k,n in Counter(d.ids).items() if n>1])

assert not broken, broken
assert not anchors, anchors
for p,d in parsed.items():
 assert d.h1 == 1, (p, d.h1)
 assert len(d.ids) == len(set(d.ids)), p
 assert all('alt' in x for x in d.img), p
 assert '{{' not in p.read_text(), p
print('PASS: all page links, anchors, H1s, IDs, alt attributes and template expansion')
