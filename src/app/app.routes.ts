import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'panel' },
  {
    path: 'captura',
    loadComponent: () => import('./pages/captura/captura.component').then((m) => m.CapturaComponent),
    data: { animation: 'captura' },
  },
  {
    path: 'panel',
    loadComponent: () => import('./pages/panel/panel.component').then((m) => m.PanelComponent),
    data: { animation: 'panel' },
  },
  {
    path: 'pedidos',
    loadComponent: () => import('./pages/pedidos/pedidos.component').then((m) => m.PedidosComponent),
    data: { animation: 'pedidos' },
  },
  {
    path: 'agenda',
    loadComponent: () => import('./pages/agenda/agenda.component').then((m) => m.AgendaComponent),
    data: { animation: 'agenda' },
  },
  {
    path: 'rentabilidad',
    loadComponent: () =>
      import('./pages/rentabilidad/rentabilidad.component').then((m) => m.RentabilidadComponent),
    data: { animation: 'rentabilidad' },
  },
  {
    path: 'clientes',
    loadComponent: () => import('./pages/clientes/clientes.component').then((m) => m.ClientesComponent),
    data: { animation: 'clientes' },
  },
  { path: '**', redirectTo: 'panel' },
];
