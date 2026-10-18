# cut this episode's sheets (all on #00FF00) -> crops/ + crops.json; look at check/csd_*.png after
import sys,json;sys.path.insert(0,'../../tools');from extract import extract
J={'A':extract('A','out-rc-02-poses-A.png',green=True,merge=3,close=2),
   'M':extract('M','out-rc-03-poses-mom.png',green=True,merge=10),
   'P':extract('P','out-rc-05-props.png',green=True,merge=10)}
json.dump(J,open('crops.json','w'));print({k:len(v) for k,v in J.items()})
