'use client';
import Link from 'next/link';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {Alert,Box,Button,Paper,Table,TableBody,TableCell,TableContainer,TableHead,TableRow,Typography,Snackbar} from '@mui/material';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import {useState} from 'react';
import {client,errorMessage,fmtDate} from '@/lib/api';
import {StatusChip} from './StatusChip';
import type {Message} from '@/types';

export function MessageTable({messages}:{messages:Message[]}) {
  const qc=useQueryClient();
  const [notice,setNotice]=useState('');
  const retry=useMutation({mutationFn:(id:string)=>client.retry(id,'success'),onSuccess:()=>{setNotice('Message queued for retry.');qc.invalidateQueries();},onError:e=>setNotice(errorMessage(e))});
  if (!messages.length) return <Paper variant="outlined" sx={{p:7,textAlign:'center'}}><Typography fontWeight={700}>No messages yet</Typography><Typography fontSize={13} color="text.secondary" sx={{mt:1}}>Send a message to start the communication history.</Typography></Paper>;
  return <><TableContainer component={Paper} elevation={0} sx={{border:'1px solid #e9edf4',borderRadius:2}}><Table sx={{minWidth:760}}>
    <TableHead><TableRow><TableCell>Candidate</TableCell><TableCell>Message</TableCell><TableCell>Status</TableCell><TableCell>Sent at</TableCell><TableCell>Action</TableCell></TableRow></TableHead>
    <TableBody>{messages.map(m=><TableRow key={m.id} hover>
      <TableCell><Typography component={Link} href={`/candidates/${m.candidate}`} sx={{fontSize:13,color:'primary.main',textDecoration:'none',fontWeight:650}}>{m.candidate_name}</Typography><Typography fontSize={11} color="text.secondary">{m.candidate_phone}</Typography></TableCell>
      <TableCell sx={{maxWidth:330}}><Typography fontSize={13} noWrap title={m.body}>{m.body}</Typography>{m.failure_reason&&<Typography fontSize={11} color={m.status==='failed'?'error.main':'text.secondary'}>{m.failure_reason}</Typography>}</TableCell>
      <TableCell><StatusChip status={m.status}/></TableCell><TableCell><Typography fontSize={12} color="text.secondary">{fmtDate(m.created_at)}</Typography></TableCell>
      <TableCell>{m.status==='failed'&&['rate_limit','service_unavailable','network_error'].includes(m.error_code)?<Button size="small" startIcon={<ReplayRoundedIcon/>} disabled={retry.isPending} onClick={()=>retry.mutate(m.id)}>Retry</Button>:<Typography color="text.disabled" fontSize={12}>—</Typography>}</TableCell>
    </TableRow>)}</TableBody>
  </Table></TableContainer><Snackbar open={!!notice} onClose={()=>setNotice('')} autoHideDuration={4500}><Alert severity="info" onClose={()=>setNotice('')}>{notice}</Alert></Snackbar></>;
}
