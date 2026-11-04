"""Independent concurrent SQLite connections execute the production SQL."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory
import json,sqlite3,threading,uuid,datetime

root=Path(__file__).resolve().parents[1]
sql=(root/'outputs/atomic-registration.sql').read_text()
topics=['Genesis of Soil Compaction','Consequences of Soil Compaction','Diagnosis of Soil Compaction','Recent Advances in Soil Compaction Assessment','Ameliorative Measures in Soil Compaction']
colleges=['srm','vit','au']
deadline=datetime.datetime(2026,11,16,11,30,tzinfo=datetime.timezone.utc).timestamp()
checks=0
def check(condition,message):
    global checks
    assert condition,message
    checks+=1;print('PASS '+message)
with TemporaryDirectory() as temporary:
    path=str(Path(temporary)/'capacity.sqlite')
    db=sqlite3.connect(path,isolation_level=None)
    for migration in sorted((root/'drizzle').glob('*.sql')):db.executescript(migration.read_text())
    db.execute('PRAGMA journal_mode=WAL')
    def attempt(college,competition='essay',topic='',email=None,mobile=None,team=None,clock=deadline-86400):
        identifier=uuid.uuid4().hex
        contact={'email':email or identifier+'@example.invalid','mobile':mobile or identifier}
        members=[contact,{'email':identifier+'-2@example.invalid','mobile':identifier+'-2'}] if competition=='ppt' else [contact]
        payload=json.dumps({'members':members,'teamNameKey':team or identifier,'consent':True})
        connection=sqlite3.connect(path,timeout=30,isolation_level=None)
        connection.create_function('unixepoch',-1,lambda value:int(clock if value=='now' else deadline))
        try:
            connection.execute(sql,(identifier,college,competition,topic or None,payload,identifier,'2026-11-04T00:00:00Z',json.dumps(topics)))
            return connection.total_changes
        finally:connection.close()
    def race(arguments):
        start=threading.Event()
        def run(args):start.wait();return attempt(*args)
        with ThreadPoolExecutor(max_workers=24) as executor:
            futures=[executor.submit(run,args) for args in arguments];start.set();return sum(f.result() for f in futures)
    def reset():db.execute('DELETE FROM registrations')
    for college in colleges:
        reset();check(race([(college,)]*40)==25,f'{college.upper()} has 25 essay winners among 40 independent concurrent writers')
        check(db.execute("SELECT count(*) FROM registrations WHERE college_id!=?",(college,)).fetchone()[0]==0,f'{college.upper()} writes remain in their own college scope')
    reset();check(race([(c,) for c in colleges for _ in range(40)])==75,'120 concurrent essay requests allocate exactly 75 seats, 25 per college')
    check(all(db.execute('SELECT count(*) FROM registrations WHERE college_id=?',(c,)).fetchone()[0]==25 for c in colleges),'all essay college counts stay independently bounded')
    reset();check(race([(c,'poster',topics[0]) for c in colleges for _ in range(35)])==75,'105 concurrent poster requests allocate exactly 75 seats')
    check(all(db.execute('SELECT count(*) FROM registrations WHERE college_id=?',(c,)).fetchone()[0]==25 for c in colleges),'all poster college counts stay at 25')
    reset();check(race([(c,'ppt',topic) for c in colleges for topic in topics for _ in range(7)])==45,'210 concurrent PPT requests across colleges and topics allocate exactly 45 teams')
    counts=db.execute('SELECT college_id,topic,count(*) FROM registrations GROUP BY college_id,topic').fetchall()
    check(len(counts)==15 and all(count==3 for _,_,count in counts),'each of 15 college-topic combinations has exactly three teams')
    check(all(db.execute('SELECT count(*) FROM registrations WHERE college_id=?',(c,)).fetchone()[0]==15 for c in colleges),'each college has exactly 15 PPT teams')
    reset();check(race([('srm','ppt',topics[0])]*20)==3,'one college topic cannot exceed three concurrent registrations')
    check(attempt('vit','ppt',topics[0])==1 and attempt('au','ppt',topics[0])==1,'full SRM topic does not remove VIT or AU slots')
    reset();check(race([('srm','essay','', 'duplicate@example.invalid')]*20)==1,'simultaneous duplicate emails consume exactly one college seat')
    check(attempt('vit','essay','', 'duplicate@example.invalid')==1,'same contact in another college is not blocked by SRM')
    reset();check(race([('au','essay','',None,'9000000000')]*20)==1,'simultaneous duplicate mobile numbers consume one seat')
    reset();check(race([('vit','ppt',topics[1],None,None,'same-normalized-team')]*20)==1,'simultaneous duplicate team names consume one team slot')
    reset()
    for _ in range(24):assert attempt('au')==1
    check(race([('au',)]*20)==1,'20 writers competing for AU’s final essay seat yield exactly one winner')
    reset();check(attempt('srm',clock=deadline-.001)==1,'database accepts a write one millisecond before the cutoff')
    check(attempt('vit',clock=deadline)==0 and attempt('au',clock=deadline+.001)==0,'database rejects at and immediately after the exact IST cutoff')
    reset();db.execute("INSERT INTO settings(key,value) VALUES('config',?)",(json.dumps({'colleges':{'srm':{'open':False}}}),))
    check(attempt('srm')==0 and attempt('vit')==1 and attempt('au')==1,'atomic write enforces college-specific manual closure')
    db.close()
print(f'{checks} independent concurrent-write and database-cutoff checks passed.')
