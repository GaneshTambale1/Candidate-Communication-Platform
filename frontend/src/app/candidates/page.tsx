'use client';
import {useState,useEffect} from 'react';
import Link from 'next/link';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {Alert,Avatar,Box,Button,Checkbox,CircularProgress,Dialog,DialogActions,DialogContent,DialogTitle,IconButton,Paper,Stack,Table,TableBody,TableCell,TableContainer,TableHead,TableRow,TextField,Typography} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {client,errorMessage} from '@/lib/api';
import {ComposeDialog} from '@/components/ComposeDialog';

const EMPTY={name:'',email:'',phone:''};
export default function CandidatesPage(){
  const [query,setQuery]=useState('');const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);
  const [selected,setSelected]=useState<string[]>([]);
  const [addOpen,setAddOpen]=useState(false);const [composeOpen,setComposeOpen]=useState(false);
  const [form,setForm]=useState(EMPTY);const [notice,setNotice]=useState('');
  const qc=useQueryClient();
  useEffect(()=>{const t=setTimeout(()=>{setSearch(query);setPage(1)},250);return()=>clearTimeout(t)},[query]);
  const list=useQuery({queryKey:['candidates',search,page],queryFn:()=>client.candidates(search,page)});
  const create=useMutation({mutationFn:()=>client.addCandidate(form),onSuccess:()=>{setForm(EMPTY);setAddOpen(false);setNotice('Candidate added successfully.');qc.invalidateQueries({queryKey:['candidates']});qc.invalidateQueries({queryKey:['dashboard']})}});
  const rows=list.data?.results??[];
  const allChecked=rows.length>0&&rows.every(c=>selected.includes(c.id));
  const selectedRows=rows.filter(c=>selected.includes(c.id));
  return <Stack spacing={3}>
    <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:2,flexWrap:'wrap'}}>
      <Box><Typography variant="h4" fontSize={{xs:25,md:30}}>Candidates</Typography><Typography color="text.secondary" fontSize={14} mt={.6}>Manage your talent pipeline and reach out to candidates.</Typography></Box>
      <Button variant="contained" startIcon={<AddRoundedIcon/>} onClick={()=>setAddOpen(true)}>Add candidate</Button>
    </Box>
    {notice&&<Alert severity="success" onClose={()=>setNotice('')}>{notice}</Alert>}
    <Paper elevation={0} sx={{p:2,border:'1px solid #e9edf4',borderRadius:2}}>
      <Box sx={{display:'flex',gap:2,alignItems:'center',justifyContent:'space-between',mb:2,flexWrap:'wrap'}}>
        <TextField size="small" placeholder="Search name, email or phone" value={query} onChange={e=>{setQuery(e.target.value);setSelected([])}} sx={{width:{xs:'100%',sm:340}}} InputProps={{startAdornment:<SearchRoundedIcon sx={{color:'#9ba4b1',mr:1}}/>}}/>
        <Button startIcon={<SendRoundedIcon/>} disabled={!selectedRows.length} variant="outlined" onClick={()=>setComposeOpen(true)}>Send message ({selectedRows.length})</Button>
      </Box>
      {list.isError&&<Alert severity="error">{errorMessage(list.error)}</Alert>}
      {list.isLoading?<Box sx={{p:6,textAlign:'center'}}><CircularProgress/></Box>:rows.length===0?<Box sx={{textAlign:'center',p:6}}><Typography fontWeight={700}>No candidates found</Typography><Typography color="text.secondary" fontSize={13} mt={1}>Add your first candidate or adjust the search.</Typography></Box>:
      <TableContainer><Table sx={{minWidth:650}}><TableHead><TableRow>
        <TableCell padding="checkbox"><Checkbox checked={allChecked} indeterminate={selected.length>0&&!allChecked} onChange={e=>setSelected(e.target.checked?rows.map(r=>r.id):[])}/></TableCell>
        <TableCell>Candidate</TableCell><TableCell>Phone number</TableCell><TableCell>Email address</TableCell><TableCell align="right">Actions</TableCell>
      </TableRow></TableHead><TableBody>{rows.map(c=><TableRow key={c.id} hover selected={selected.includes(c.id)}>
        <TableCell padding="checkbox"><Checkbox checked={selected.includes(c.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,c.id]:s.filter(x=>x!==c.id))}/></TableCell>
        <TableCell><Box sx={{display:'flex',alignItems:'center',gap:1.4}}><Avatar sx={{width:33,height:33,fontSize:12,bgcolor:'#e8edff',color:'#295bd1'}}>{c.name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</Avatar><Typography fontWeight={650} fontSize={13}>{c.name}</Typography></Box></TableCell>
        <TableCell><Typography fontSize={13}>{c.phone}</Typography></TableCell><TableCell><Typography fontSize={13}>{c.email}</Typography></TableCell>
        <TableCell align="right"><IconButton size="small" component={Link} href={`/candidates/${c.id}`} aria-label={`View ${c.name}`}><VisibilityOutlinedIcon fontSize="small"/></IconButton></TableCell>
      </TableRow>)}</TableBody></Table></TableContainer>}
      <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',mt:2}}><Typography color="text.secondary" fontSize={12}>Total: {list.data?.count??0} candidates</Typography><Box><Button disabled={page<=1} onClick={()=>{setPage(p=>p-1);setSelected([])}}>Previous</Button><Typography component="span" fontSize={12} sx={{mx:1}}>Page {page}</Typography><Button disabled={!list.data?.next} onClick={()=>{setPage(p=>p+1);setSelected([])}}>Next</Button></Box></Box>
    </Paper>
    <Dialog open={addOpen} onClose={()=>setAddOpen(false)} fullWidth maxWidth="sm"><DialogTitle sx={{fontWeight:750}}>Add candidate</DialogTitle><DialogContent sx={{display:'grid',gap:2,pt:'12px!important'}}>
      <TextField fullWidth label="Full name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
      <TextField fullWidth type="email" label="Email address" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
      <TextField fullWidth label="Phone number" placeholder="+919876543210" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} helperText="Include country code (E.164)."/>
      {create.isError&&<Alert severity="error">{errorMessage(create.error)}</Alert>}
    </DialogContent><DialogActions sx={{p:3,pt:1}}><Button onClick={()=>setAddOpen(false)}>Cancel</Button><Button variant="contained" disabled={create.isPending||form.name.trim().length<2||!form.email.includes('@')||!form.phone.startsWith('+')} onClick={()=>create.mutate()}>{create.isPending?'Saving...':'Create candidate'}</Button></DialogActions></Dialog>
    <ComposeDialog open={composeOpen} onClose={()=>setComposeOpen(false)} candidates={selectedRows}/>
  </Stack>;
}
