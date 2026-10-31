'use client';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Alert,Box,Breadcrumbs,Button,CircularProgress,Grid,Paper,Stack,Typography} from '@mui/material';
import {client,errorMessage,fmtDate} from '@/lib/api';
import {MessageTable} from '@/components/MessageTable';
export default function BatchDetail(){
  const id=String(useParams().id);const [page,setPage]=useState(1);
  const batch=useQuery({queryKey:['batch',id],queryFn:()=>client.batch(id),refetchInterval:3500});
  const messages=useQuery({queryKey:['batchMessages',id,page],queryFn:()=>client.batchMessages(id,page),refetchInterval:3500});
  if (batch.isLoading)return <CircularProgress/>;
  if (batch.isError)return <Alert severity="error">{errorMessage(batch.error)}</Alert>;
  const b=batch.data!;
  return <Stack spacing={3}>
    <Breadcrumbs><Link href="/batches">Bulk campaigns</Link><Typography color="text.primary">Campaign details</Typography></Breadcrumbs>
    <Box><Typography variant="h4" fontSize={{xs:25,md:30}}>Campaign results</Typography><Typography color="text.secondary" fontSize={13}>{fmtDate(b.created_at)} · {b.total} recipients</Typography></Box>
    <Grid container spacing={2}>{[{l:'Total recipients',v:b.total},{l:'Queued / sending',v:b.queued},{l:'Delivered or read',v:b.delivered+b.read},{l:'Failed',v:b.failed}].map(s=><Grid size={{xs:6,md:3}} key={s.l}><Paper variant="outlined" sx={{p:2.5}}><Typography color="text.secondary" fontSize={12}>{s.l}</Typography><Typography fontSize={29} fontWeight={750}>{s.v}</Typography></Paper></Grid>)}</Grid>
    <Box><Typography variant="h6" mb={2}>Individual results</Typography>{messages.isError?<Alert severity="error">{errorMessage(messages.error)}</Alert>:<MessageTable messages={messages.data?.results??[]}/>}</Box>
    <Box display="flex" justifyContent="flex-end" alignItems="center"><Button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</Button><Typography fontSize={12}>Page {page}</Typography><Button disabled={!messages.data?.next} onClick={()=>setPage(p=>p+1)}>Next</Button></Box>
  </Stack>;
}
