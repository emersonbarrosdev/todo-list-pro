import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { TodoModel } from '../../model/todo-model';

@Component({
  selector: 'app-todo-list',
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.scss'],
  standalone: false
})
export class TodoListComponent implements OnInit {

  todos: TodoModel[] = [];
  newTodo: string = '';
  form: FormGroup;

  constructor(
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    this.forms();
  }

  forms() {
    this.form = this.formBuilder.group({
      newTodo: ['']
    });
  }

  getFormControl() {
    return this.form.controls;
  }

  public saveTodo() {
    if (this.getFormControl()['newTodo']) {
      let todo = new TodoModel();
      todo.name = this.getFormControl()['newTodo'].value;
      todo.isCompleted = true;
      this.todos.push(todo);
      this.getFormControl()['newTodo'].patchValue('');
    } else {
      alert('Digite uma tarefa!')
    }
  }

  done(id: number) {
    this.todos[id].isCompleted = !this.todos[id].isCompleted
  }

  remove(id: number) {
    this.todos = this.todos.filter((x, y) => y !== id)
  }

}
