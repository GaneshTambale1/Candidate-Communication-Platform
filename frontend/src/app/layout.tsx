import type {Metadata} from 'next';
import './globals.css';
import {Providers} from '@/components/Providers';
import {AppShell} from '@/components/AppShell';
export const metadata:Metadata={title:'ConnectFlow | Candidate Communication Platform',description:'Recruitment communication and delivery tracking'};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><Providers><AppShell>{children}</AppShell></Providers></body></html>;
}
