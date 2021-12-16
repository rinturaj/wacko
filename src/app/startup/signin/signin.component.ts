import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GunDb } from 'src/app/services/gun-db.service';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LoadingController } from '@ionic/angular';


@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],

})
export class SigninComponent implements OnInit {


  err
  constructor(private db: GunDb, private router: Router, public loadingController: LoadingController) {



  }

  ngOnInit() {

  }
  async login(value) {

    // this.db.user.create(value.username, value.password, (err: any) => {
    //   if (err) {


    //     if (err.err == 'User already created!') {
    //       this.err = ''
    //       this.db.user.auth(value.username, value.password, (ack: any) => {
    //         if (ack.err) {
    //           this.err = ack.err
    //         } else {
    //           this.router.navigateByUrl('home')
    //         }
    //       })
    //     }
    //     console.log(err);
    //   } else {
    //     this.err = ''


    const loading = await this.loadingController.create({
      message: 'Please wait...',
      animated:true
    });
    await loading.present();

  
    const hapticsImpactLight = async () => {
      await Haptics.impact({ style: ImpactStyle.Light });
    };
 

    this.db.user.auth(value.username, value.password, (ack: any) => {
      loading.dismiss()
      if (ack.err) {
        this.err = ack.err
        hapticsImpactLight()
      } else {
 
        this.router.navigateByUrl('home')
      }
    })
    // }
    // })

  }

}
