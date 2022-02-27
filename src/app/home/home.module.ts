import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './pages/home/home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { HeaderComponent } from './components/header/header.component';
import { AvatarComponent } from './components/avatar/avatar.component';
import { ProfilepageComponent } from './pages/profilepage/profilepage.component';
import { UiModule } from '../ui/ui.module';
import { ViewprofileComponent } from './components/viewprofile/viewprofile.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    UiModule
  ],
  declarations: [
    HomePage,
    HeaderComponent,
    AvatarComponent,
    ProfilepageComponent,
    ViewprofileComponent
  ]
})
export class HomePageModule { }
