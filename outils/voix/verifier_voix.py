import sys, torchaudio as ta, torchaudio.functional as AF
from faster_whisper import WhisperModel
m=WhisperModel('small',device='cpu',compute_type='int8')
for f in sys.argv[1:]:
    w,sr=ta.load(f); a=AF.resample(w.mean(0),sr,16000).numpy()
    segs,_=m.transcribe(a,language='fr',word_timestamps=True)
    segs=list(segs)
    txt=' '.join(s.text.strip() for s in segs)
    end=segs[-1].end if segs else 0
    print(f, '|', txt, '| speech_end', round(end,2))
