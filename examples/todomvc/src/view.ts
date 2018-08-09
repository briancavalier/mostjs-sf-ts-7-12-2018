import { compose } from '@most/prelude'
import { wire } from 'hyperhtml'
import { App, Todo, completedCount } from './model'
import { Action, handleAdd, handleToggleAll, handleComplete, handleRemove, handleRemoveAllCompleted } from './action'

const maybeClass = (className: string) => (condition: boolean): string =>
  condition ? className : ''
const ifCompleted = maybeClass('completed')
const ifSelected = maybeClass('selected')

const filterTodos = ({ filter, todos }: App): Todo[] =>
  todos.filter(t => {
    switch (filter) {
      case '/': return true
      case '/active': return !t.completed
      case '/completed': return t.completed
    }
  })

export const updateView = (addAction: (a: Action) => void) => (appState: App): Element => {
  const completed = completedCount(appState)
  const todos = appState.todos
  const filtered = filterTodos(appState)
  const remaining = todos.length - completed

  return wire()`
    <header class="header">
      <h1>todos</h1>
      <input class="new-todo" name="new-todo" placeholder="What needs to be done?" autofocus onkeypress="${compose(addAction, handleAdd)}">
    </header>
    ${renderTodoList(addAction, todos.length > 0 && remaining === 0, filtered)}
    ${renderFooter(addAction, remaining, completed, appState)}`
}

export const renderTodoList = (addAction: (a: Action) => void, allCompleted: boolean, todos: Todo[]): Element =>
  wire()`<section class="main">
    <input id="toggle-all" class="toggle-all" type="checkbox" checked=${allCompleted} onchange=${compose(addAction, handleToggleAll)}>
    <label for="toggle-all">Mark all as complete</label>
    <ul class="todo-list">
      <!-- These are here just to show the structure of the list items -->
      <!-- List items should get the class editing when editing and completed when marked as completed -->
      ${todos.map(renderTodo(addAction))}
    </ul>
  </section>`

export const renderTodo = (addAction: (a: Action) => void) => ({ id, completed, description }: Todo): Element =>
  wire()`<li data-id="${id}" class="${ifCompleted(completed)}">
    <div class="view">
      <input class="toggle" type="checkbox" checked=${completed} onchange=${compose(addAction, handleComplete)}>
      <label>${description}</label>
      <button class="destroy" onclick="${compose(addAction, handleRemove)}"></button>
    </div>
    <input class="edit" value="${description}">
  </li>`

export const renderFooter = (addAction: (a: Action) => void, remainingCount: number, completedCount: number, { todos, filter }: App): Element =>
  wire()`<footer class="footer" style="${todos.length === 0 ? 'display:none' : ''}">
    <!-- This should be 0 items left by default -->
    <span class="todo-count"><strong>${remainingCount}</strong> ${remainingCount === 1 ? 'item' : 'items'} left</span>
    <!-- Remove this if you don't implement routing -->
    <ul class="filters">
      <li><a class="${ifSelected(filter === '/')}" href="#/">All</a><li>
      <li><a class="${ifSelected(filter === '/active')}" href="#/active">Active</a><li>
      <li><a class="${ifSelected(filter === '/completed')}" href="#/completed">Completed</a><li>
    </ul>
    <!-- Hidden if no completed items are left ↓ -->
    <button class="clear-completed" style="${completedCount > 0 ? '' : 'display:none'}" onclick="${compose(addAction, handleRemoveAllCompleted)}">Clear completed</button>
  </footer>`
