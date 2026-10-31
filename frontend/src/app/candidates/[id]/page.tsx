'use client';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {Alert,Avatar,Box,Breadcrumbs,Button,CircularProgress,Paper,Stack,TextField,Typography} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {client,errorMessage} from '@/lib/api';
import {MessageTable} from '@/components/MessageTable';
import {ComposeDialog} from '@/components/ComposeDialog';

export default function CandidateDetail(){
  const params=useParams();const id=String(params.id);
  const [compose,setCompose]=useState(false);const [editing,setEditing]=useState(false);const [notice,setNotice]=useState('');
  const [form,setForm]=useState({name:'',email:'',phone:''});
  const [page,setPage]=useState(1);const qc=useQueryClient();
  const candidate=useQuery({queryKey:['candidate',id],queryFn:()=>client.candidate(id)});
  const messages=useQuery({queryKey:['candidateMessages',id,page],queryFn:()=>client.candidateMessages(id,page),refetchInterval:3500});
  const save=useMutation({mutationFn:()=>client.updateCandidate(id,form),onSuccess:()=>{setEditing(false);setNotice('Candidate updated.');qc.invalidateQueries({queryKey:['candidate',id]});qc.invalidateQueries({queryKey:['candidates']})}});
  if(candidate.isLoading)return <CircularProgress/>;
  if(candidate.isError||!candidate.data)return <Alert severity="error">{errorMessage(candidate.error)}</Alert>;
  const c=candidate.data;
  return <Stack spacing={3}>
    <Breadcrumbs><Link href="/candidates">Candidates</Link><Typography color="text.primary">{c.name}</Typography></Breadcrumbs>
    {notice&&<Alert severity="success" onClose={()=>setNotice('')}>{notice}</Alert>}
    <Paper variant="outlined" sx={{p:3,borderRadius:2}}>
      <Box sx={{display:'flex',alignItems:'center',gap:2,flexWrap:'wrap'}}><Avatar sx={{width:60,height:60,bgcolor:'#e6eeff',color:'#285bd2',fontWeight:700,fontSize:22}}>{c.name[0]}</Avatar>
        <Box sx={{flex:1}}><Typography variant="h5">{c.name}</Typography><Typography color="text.secondary" fontSize={13}>{c.email} · {c.phone}</Typography></Box>
        <Button variant="outlined" startIcon={<EditOutlinedIcon/>} onClick={()=>{setForm({name:c.name,email:c.email,phone:c.phone});setEditing(!editing)}}>Edit</Button>
        <Button variant="contained" startIcon={<SendRoundedIcon/>} onClick={()=>setCompose(true)}>Send message</Button>
      </Box>
      {editing&&<Box sx={{display:'flex',gap:2,mt:3,flexWrap:'wrap'}}>
        <TextField label="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
        <TextField label="Email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
        <TextField label="Phone" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
        <Button variant="contained" onClick={()=>save.mutate()} disabled={save.isPending}>Save</Button>
        {save.isError&&<Alert severity="error">{errorMessage(save.error)}</Alert>}
      </Box>}
    </Paper>
    <Box><Typography variant="h6" mb={.5}>Communication history</Typography><Typography color="text.secondary" fontSize={13} mb={2}>Messages update automatically as the provider sends delivery events.</Typography>
      {messages.isError?<Alert severity="error">{errorMessage(messages.error)}</Alert>:<MessageTable messages={messages.data?.results??[]}/>}
      <Box mt={2} display="flex" justifyContent="flex-end" alignItems="center"><Button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</Button><Typography fontSize={12}>Page {page}</Typography><Button disabled={!messages.data?.next} onClick={()=>setPage(p=>p+1)}>Next</Button></Box>
    </Box>
    <ComposeDialog open={compose} onClose={()=>setCompose(false)} candidates={[c]}/>
  </Stack>;
}
