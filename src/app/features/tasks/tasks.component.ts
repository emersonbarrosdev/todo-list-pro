import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tasks-page">
      <h1>TODO PRO</h1>
      <p>Gerenciamento de tarefas simples, rápido e moderno.</p>
    </div>
  `,
})
export class TasksComponent {}
