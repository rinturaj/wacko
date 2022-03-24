import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Route, Routes } from '@angular/router';
import { SigninComponent } from './signin/signin.component';
import { GetstartedComponent } from './getstarted/getstarted.component';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

const route: Routes =
  [
    { path: '', pathMatch: 'full', redirectTo: 'start' },
    { path: 'signin', component: SigninComponent },
    { path: 'start', component: GetstartedComponent },
  ]



@NgModule({

  declarations: [
    SigninComponent,
    GetstartedComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(route)
  ]
})
export class StartupModule { }
