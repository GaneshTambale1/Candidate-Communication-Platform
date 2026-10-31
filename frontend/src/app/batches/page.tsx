'use client';
import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {Alert,Box,Button,CircularProgress,Paper,Stack,Table,TableBody,TableCell,TableContainer,TableHead,TableRow,Typography} from '@mui/material';
import {client,errorMessage,fmtDate} from '@/lib/api';
export default function BatchesPage(){
  const batches=useQuery({queryKey:['batches'],queryFn:client.batches,refetchInterval:4000});
  return <Stack spacing={3}><Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:2}}><Box><Typography variant="h4" fontSize={{xs:25,md:30}}>Bulk campaigns</Typography><Typography color="text.secondary" fontSize={13} mt={.5}>Review batches and individual candidate outcomes.</Typography></Box><Button variant="contained" component={Link} href="/candidates">New campaign</Button></Box>
    {batches.isFetching&&<CircularProgress size={18}/>}
    {batches.isError?<Alert severity="error">{errorMessage(batches.error)}</Alert>:<TableContainer component={Paper} sx={{border:'1px solid #e9edf4'}}><Table><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Recipients</TableCell><TableCell>Read</TableCell><TableCell>Delivered</TableCell><TableCell>Failed</TableCell><TableCell/></TableRow></TableHead>
      <TableBody>{(batches.data?.results??[]).map(b=><TableRow key={b.id} hover><TableCell>{fmtDate(b.created_at)}</TableCell><TableCell>{b.total}</TableCell><TableCell>{b.read}</TableCell><TableCell>{b.delivered}</TableCell><TableCell>{b.failed}</TableCell><TableCell><Button component={Link} href={`/batches/${b.id}`}>View results</Button></TableCell></TableRow>)}</TableBody></Table>
      {!batches.data?.results.length&&<Box p={6} textAlign="center"><Typography fontWeight={700}>No bulk campaigns yet</Typography><Typography color="text.secondary" fontSize={13}>Select multiple candidates to begin.</Typography></Box>}
    </TableContainer>}
  </Stack>;
}
