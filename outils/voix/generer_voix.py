import sys, json, time, torchaudio as ta, torch
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
jobs=json.load(open(sys.argv[1]))
torch.manual_seed(0)
m=ChatterboxMultilingualTTS.from_pretrained(device='cpu')
for j in jobs:
    t=time.time()
    kw=dict(language_id='fr',exaggeration=j.get('ex',0.5),cfg_weight=j.get('cfg',0.5),temperature=j.get('temp',0.8))
    if j.get('ref'): kw['audio_prompt_path']=j['ref']
    wav=m.generate(j['text'],**kw)
    ta.save(j['out'],wav,m.sr)
    print('done',j['out'],round(time.time()-t),round(wav.shape[-1]/m.sr,2),flush=True)
