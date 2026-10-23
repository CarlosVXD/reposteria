import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  readonly navItems: NavItem[] = [
    { path: '/captura', label: 'Captura', icon: 'sparkle' },
    { path: '/agenda', label: 'Agenda', icon: 'calendar' },
    { path: '/rentabilidad', label: 'Rentabilidad', icon: 'chart' },
    { path: '/panel', label: 'Panel ejecutivo', icon: 'grid'},
    { path: '/pedidos', label: 'Pedidos', icon: 'cake' },
  ];
}
