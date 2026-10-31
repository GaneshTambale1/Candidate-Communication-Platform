'use client';
import React,{useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {AppBar,Avatar,Box,CssBaseline,Divider,Drawer,IconButton,List,ListItemButton,ListItemIcon,ListItemText,Toolbar,Typography,Chip} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import SmsRoundedIcon from '@mui/icons-material/SmsRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
const WIDTH = 248;
const items = [
  {href:'/',text:'Dashboard',icon:<DashboardRoundedIcon/>},
  {href:'/candidates',text:'Candidates',icon:<GroupsRoundedIcon/>},
  {href:'/messages',text:'Messages',icon:<SmsRoundedIcon/>},
  {href:'/batches',text:'Bulk campaigns',icon:<LayersRoundedIcon/>},
];
export function AppShell({children}:{children:React.ReactNode}) {
  const pathname=usePathname();
  const [mobile,setMobile]=useState(false);
  const sidebar=<Box sx={{p:2.5,height:'100%',display:'flex',flexDirection:'column'}}>
    <Box sx={{display:'flex',alignItems:'center',gap:1.4,mb:5,mt:1,px:1}}>
      <Box sx={{width:39,height:39,borderRadius:2,background:'#3165dc',display:'grid',placeItems:'center',color:'white'}}><MailOutlineRoundedIcon/></Box>
      <Box><Typography fontWeight={800} fontSize={17} lineHeight={1.2}>ConnectFlow</Typography><Typography color="text.secondary" fontSize={11}>Recruitment messaging</Typography></Box>
    </Box>
    <Typography sx={{fontSize:10,letterSpacing:1.6,fontWeight:800,color:'#9aa4b5',mb:1,px:2}}>WORKSPACE</Typography>
    <List disablePadding>
      {items.map(item=>{
        const active=item.href==='/'?pathname==='/':pathname.startsWith(item.href);
        return <ListItemButton key={item.href} component={Link} href={item.href} onClick={()=>setMobile(false)} selected={active} sx={{borderRadius:2,mb:0.6,'&.Mui-selected':{background:'#eaf0ff',color:'#245cd3'},'&.Mui-selected .MuiListItemIcon-root':{color:'#245cd3'}}}>
          <ListItemIcon sx={{minWidth:36,color:active?'#245cd3':'#8791a5'}}>{item.icon}</ListItemIcon>
          <ListItemText primary={item.text} primaryTypographyProps={{fontSize:14,fontWeight:active?750:550}}/>
        </ListItemButton>;
      })}
    </List>
    <Box sx={{mt:'auto',p:1.5,borderRadius:2,bgcolor:'#f5f8ff'}}>
      <Typography fontSize={12} fontWeight={700}>Demo provider</Typography>
      <Box sx={{display:'flex',alignItems:'center',gap:.6,mt:.5}}><FiberManualRecordIcon sx={{fontSize:9,color:'#1faa77'}}/><Typography fontSize={11} color="text.secondary">Simulated delivery</Typography></Box>
    </Box>
  </Box>;
  return <Box sx={{display:'flex',minHeight:'100vh'}}>
    <CssBaseline/>
    <AppBar position="fixed" elevation={0} color="inherit" sx={{zIndex:theme=>theme.zIndex.drawer+1,ml:{md:`${WIDTH}px`},width:{md:`calc(100% - ${WIDTH}px)`},borderBottom:'1px solid #e9edf4'}}>
      <Toolbar sx={{gap:2}}><IconButton onClick={()=>setMobile(!mobile)} sx={{display:{md:'none'}}}><MenuRoundedIcon/></IconButton>
      <Typography fontSize={14} fontWeight={600} sx={{flexGrow:1}}>Candidate Communication Platform</Typography>
      <Chip label="Demo mode" size="small" color="primary" variant="outlined" sx={{display:{xs:'none',sm:'flex'}}}/>
      <Divider orientation="vertical" flexItem sx={{mx:1,my:1.4}}/>
      <Avatar sx={{width:34,height:34,bgcolor:'#dfe8ff',color:'#2356c5',fontSize:13,fontWeight:800}}>RT</Avatar>
      <Box sx={{display:{xs:'none',sm:'block'}}}><Typography fontSize={12} fontWeight={700}>Recruiter</Typography><Typography fontSize={10} color="text.secondary">Workspace admin</Typography></Box>
      </Toolbar>
    </AppBar>
    <Drawer variant="permanent" sx={{display:{xs:'none',md:'block'},width:WIDTH,flexShrink:0,'& .MuiDrawer-paper':{width:WIDTH,boxSizing:'border-box',borderRight:'1px solid #e9edf4'}}} open>{sidebar}</Drawer>
    <Drawer variant="temporary" open={mobile} onClose={()=>setMobile(false)} ModalProps={{keepMounted:true}} sx={{display:{xs:'block',md:'none'},'& .MuiDrawer-paper':{width:WIDTH}}}>{sidebar}</Drawer>
    <Box component="main" sx={{flexGrow:1,minWidth:0,p:{xs:2,md:4},pt:{xs:11,md:12},maxWidth:1700,mx:'auto'}}>{children}</Box>
  </Box>;
}
