import {Chip} from '@mui/material';
import type {Status} from '@/types';
export function StatusChip({status}:{status:Status}) {
  const config:Record<Status,{color:'default'|'info'|'success'|'error'|'warning';label:string}> = {
    queued:{color:'default',label:'Queued'},sending:{color:'info',label:'Sending'},
    sent:{color:'info',label:'Sent'},delivered:{color:'success',label:'Delivered'},
    read:{color:'success',label:'Read'},failed:{color:'error',label:'Failed'},
  };
  const v=config[status];
  return <Chip label={v.label} size="small" color={v.color} variant="outlined" sx={{fontWeight:650,fontSize:11}}/>;
}
