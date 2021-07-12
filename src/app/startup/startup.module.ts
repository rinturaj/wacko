import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Route, Routes } from '@angular/router';
import { SigninComponent } from './signin/signin.component';
import { GetstartedComponent } from './getstarted/getstarted.component';
import { IonicModule } from '@ionic/angular';

const route: Routes =
  [
    { path: '', pathMatch: 'full', redirectTo: 'signin' },
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
    RouterModule.forChild(route)
  ]
})
export class StartupModule { }
