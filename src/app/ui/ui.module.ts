import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from './components/avatar/avatar.component';
import { ButtonComponent } from './components/button/button.component';



@NgModule({
  declarations: [
    AvatarComponent,
    ButtonComponent
  ],
  imports: [
    CommonModule,
    
  ],exports: [
    AvatarComponent,
    ButtonComponent
  ]
})
export class UiModule { }
