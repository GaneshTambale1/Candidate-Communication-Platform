'use client';
import {useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ThemeProvider, createTheme, CssBaseline} from '@mui/material';

const theme = createTheme({
  palette: { mode:'light', primary:{main:'#3165dc'}, background:{default:'#f6f8fc',paper:'#ffffff'}, text:{primary:'#18233b',secondary:'#6a7486'} },
  shape:{borderRadius:10},
  typography:{fontFamily:'Inter, Arial, sans-serif',h4:{fontWeight:750},h5:{fontWeight:750},h6:{fontWeight:720},button:{textTransform:'none',fontWeight:650}},
  components:{
    MuiButton:{styleOverrides:{root:{boxShadow:'none',borderRadius:9}}},
    MuiPaper:{styleOverrides:{root:{backgroundImage:'none'}}},
    MuiTableHead:{styleOverrides:{root:{backgroundColor:'#f7f9fc'}}},
    MuiTableCell:{styleOverrides:{head:{fontWeight:650,color:'#687488',fontSize:12,borderColor:'#edf1f5'},body:{borderColor:'#edf1f5'}}},
    MuiTextField:{defaultProps:{size:'small'}},
  }
});
export function Providers({children}:{children:React.ReactNode}) {
  const [queryClient] = useState(()=>new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:true,staleTime:1000}}}));
  return <QueryClientProvider client={queryClient}><ThemeProvider theme={theme}><CssBaseline/>{children}</ThemeProvider></QueryClientProvider>;
}
