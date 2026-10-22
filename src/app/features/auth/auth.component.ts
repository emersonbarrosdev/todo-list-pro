import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="auth-page">
      <h2>Entrar no TODO PRO</h2>
    </div>
  `,
})
export class AuthComponent {}
