'use client';
import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {Alert,Box,Button,Card,CardContent,CircularProgress,Grid,Paper,Stack,Typography} from '@mui/material';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import SmsFailedRoundedIcon from '@mui/icons-material/SmsFailedRounded';
import SmsRoundedIcon from '@mui/icons-material/SmsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import {client,errorMessage} from '@/lib/api';
import {MessageTable} from '@/components/MessageTable';
export default function Dashboard(){
  const overview=useQuery({queryKey:['dashboard'],queryFn:client.dashboard,refetchInterval:4000});
  const recent=useQuery({queryKey:['messages','dashboard'],queryFn:()=>client.messages(),refetchInterval:4000});
  const stats=[
    {label:'Total candidates',value:overview.data?.candidates,icon:<PeopleAltRoundedIcon/>,color:'#315fd4'},
    {label:'Total messages',value:overview.data?.messages,icon:<SmsRoundedIcon/>,color:'#7951c9'},
    {label:'Delivered + read',value:(overview.data?.delivered??0)+(overview.data?.read??0),icon:<MarkEmailReadRoundedIcon/>,color:'#149d79'},
    {label:'Failed messages',value:overview.data?.failed,icon:<SmsFailedRoundedIcon/>,color:'#db5362'},
  ];
  return <Stack spacing={3}>
    <Box sx={{display:'flex',justifyContent:'space-between',gap:2,alignItems:'center',flexWrap:'wrap'}}>
      <Box><Typography variant="h4" fontSize={{xs:25,md:30}}>Overview</Typography><Typography color="text.secondary" fontSize={14} mt={.6}>Welcome back. Here is your candidate communication summary.</Typography></Box>
      <Button variant="contained" component={Link} href="/candidates" endIcon={<ArrowForwardRoundedIcon/>}>View candidates</Button>
    </Box>
    {overview.isError&&<Alert severity="error">{errorMessage(overview.error)}</Alert>}
    <Grid container spacing={2}>{stats.map(stat=><Grid key={stat.label} size={{xs:12,sm:6,lg:3}}><Card elevation={0} sx={{border:'1px solid #e7ebf3',height:'100%'}}><CardContent sx={{p:2.5}}>
      <Box sx={{display:'flex',justifyContent:'space-between',mb:2}}><Typography fontSize={13} color="text.secondary">{stat.label}</Typography><Box sx={{color:stat.color}}>{stat.icon}</Box></Box>
      <Typography fontSize={30} fontWeight={800}>{overview.isLoading?'—':stat.value??0}</Typography>
    </CardContent></Card></Grid>)}</Grid>
    <Paper variant="outlined" sx={{p:2.5,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:1}}>
      <Box><Typography fontWeight={700}>Live communication activity</Typography><Typography color="text.secondary" fontSize={13}>Message delivery and read statuses refresh automatically.</Typography></Box>
      <Box sx={{display:'flex',gap:2,alignItems:'center'}}><Typography fontSize={13} color="text.secondary">Pending: <b>{overview.data?.pending??0}</b></Typography><Button component={Link} href="/messages">All messages</Button></Box>
    </Paper>
    <Box><Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center',mb:2}}><Typography variant="h6">Recent messages</Typography>{recent.isFetching&&<CircularProgress size={16}/>}</Box>
      {recent.isError?<Alert severity="error">{errorMessage(recent.error)}</Alert>:<MessageTable messages={(recent.data?.results??[]).slice(0,8)}/>}
    </Box>
  </Stack>;
}
