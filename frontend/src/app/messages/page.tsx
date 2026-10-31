'use client';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Alert,Box,Button,CircularProgress,FormControl,MenuItem,Paper,Select,Stack,Typography} from '@mui/material';
import Link from 'next/link';
import {client,errorMessage} from '@/lib/api';
import {MessageTable} from '@/components/MessageTable';
import type {Status} from '@/types';
export default function MessagesPage(){
  const [filter,setFilter]=useState<''|Status>('');const [page,setPage]=useState(1);
  const list=useQuery({queryKey:['allMessages',filter,page],queryFn:()=>client.messages({...(filter?{status:filter}:{}),page}),refetchInterval:3500});
  return <Stack spacing={3}>
    <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:2}}><Box><Typography variant="h4" fontSize={{xs:25,md:30}}>Message activity</Typography><Typography color="text.secondary" fontSize={13} mt={.5}>Track every individual delivery and identify failures.</Typography></Box><Button variant="contained" component={Link} href="/candidates">Compose a message</Button></Box>
    <Paper variant="outlined" sx={{p:2,borderRadius:2,display:'flex',alignItems:'center',gap:2}}><Typography fontSize={13} fontWeight={650}>Status</Typography><FormControl size="small" sx={{minWidth:190}}><Select value={filter} onChange={e=>{setFilter(e.target.value as ''|Status);setPage(1)}}>{['','queued','sending','sent','delivered','read','failed'].map(s=><MenuItem key={s} value={s}>{s?s[0].toUpperCase()+s.slice(1):'All statuses'}</MenuItem>)}</Select></FormControl>{list.isFetching&&<CircularProgress size={17}/>}</Paper>
    {list.isError?<Alert severity="error">{errorMessage(list.error)}</Alert>:<MessageTable messages={list.data?.results??[]}/>}
    <Box display="flex" justifyContent="space-between" alignItems="center"><Typography fontSize={12} color="text.secondary">{list.data?.count??0} messages</Typography><Box><Button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</Button><Typography component="span" fontSize={12}>Page {page}</Typography><Button disabled={!list.data?.next} onClick={()=>setPage(p=>p+1)}>Next</Button></Box></Box>
  </Stack>;
}
