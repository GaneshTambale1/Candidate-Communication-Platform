'use client';
import {useState,useEffect} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {useRouter} from 'next/navigation';
import {Alert,Box,Button,Dialog,DialogActions,DialogContent,DialogTitle,FormControl,FormHelperText,InputLabel,MenuItem,Select,TextField,Typography,FormControlLabel,Switch} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import type {Candidate,Scenario} from '@/types';
import {client,errorMessage} from '@/lib/api';
const scenarios:{value:Scenario;label:string}[]=[
  {value:'success',label:'Normal delivery → read'},
  {value:'delivery_failure',label:'Simulate delivery failure'},
  {value:'temporary_failure',label:'Temporary provider error (auto retry)'},
  {value:'rate_limit',label:'Rate limiting (auto retry)'},
  {value:'invalid_recipient',label:'Invalid recipient (permanent)'},
  {value:'provider_unavailable',label:'Provider outage (eventually fails)'},
];
export function ComposeDialog({open,onClose,candidates}:{open:boolean;onClose:()=>void;candidates:Candidate[]}){
  const [body,setBody]=useState('');
  const [scenario,setScenario]=useState<Scenario>('success');
  const [mixed,setMixed]=useState(false);
  const [error,setError]=useState('');
  const qc=useQueryClient();const router=useRouter();
  useEffect(()=>{if(open){setError('');setScenario('success');setMixed(false);setBody('');}},[open]);
  const mutation=useMutation({mutationFn:async()=> candidates.length===1?client.send(candidates[0].id,body,scenario):client.sendBulk(candidates.map(c=>c.id),body,scenario,mixed),onSuccess:(res)=>{qc.invalidateQueries();onClose();if ('batch_id' in res) router.push(`/batches/${res.batch_id}`);else router.push('/messages');},onError:e=>setError(errorMessage(e))});
  return <Dialog open={open} onClose={mutation.isPending?undefined:onClose} fullWidth maxWidth="sm">
    <DialogTitle sx={{fontWeight:750}}>Compose message</DialogTitle>
    <DialogContent sx={{display:'grid',gap:2,pt:'12px!important'}}>
      <Box sx={{bgcolor:'#f4f7fd',borderRadius:2,p:2}}><Typography fontWeight={700} fontSize={13}>Recipients: {candidates.length}</Typography><Typography fontSize={12} color="text.secondary">{candidates.slice(0,4).map(c=>c.name).join(', ')}{candidates.length>4?' and more':''}</Typography></Box>
      <TextField label="Message" multiline rows={4} fullWidth value={body} onChange={e=>setBody(e.target.value)} inputProps={{maxLength:2000}} helperText={`${body.length}/2000 characters`}/>
      <FormControl size="small" fullWidth><InputLabel>Provider simulation</InputLabel><Select label="Provider simulation" value={scenario} onChange={e=>setScenario(e.target.value as Scenario)}>{scenarios.map(s=><MenuItem value={s.value} key={s.value}>{s.label}</MenuItem>)}</Select><FormHelperText>Only simulated communication; no real SMS is sent.</FormHelperText></FormControl>
      {candidates.length>=3&&<FormControlLabel control={<Switch checked={mixed} onChange={e=>setMixed(e.target.checked)}/>} label="Demo mixed results (third candidate fails delivery)"/>}
      {error&&<Alert severity="error">{error}</Alert>}
    </DialogContent>
    <DialogActions sx={{p:3,pt:1}}><Button onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button variant="contained" disabled={mutation.isPending||!body.trim()||body.length>2000||!candidates.length} onClick={()=>mutation.mutate()} startIcon={<SendRoundedIcon/>}>{mutation.isPending?'Queuing...':`Send to ${candidates.length} candidate${candidates.length>1?'s':''}`}</Button></DialogActions>
  </Dialog>;
}
