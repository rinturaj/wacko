import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from './components/avatar/avatar.component';
import { ButtonComponent } from './components/button/button.component';
import { AudiotrackComponent } from './components/audiotrack/audiotrack.component';



@NgModule({
  declarations: [
    AvatarComponent,
    ButtonComponent,
    AudiotrackComponent
  ],
  imports: [
    CommonModule,
    
  ],exports: [
    AvatarComponent,
    ButtonComponent,
    AudiotrackComponent
  ]
})
export class UiModule { }
