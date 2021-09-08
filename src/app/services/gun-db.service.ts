import { Injectable } from '@angular/core';
import Gun from 'gun/gun';
import  'gun/sea';
import  'gun/axe';

@Injectable({
  providedIn: 'root'
})
export class GunDb {
   gun = Gun('https://gunserver-wacko.herokuapp.com/gun');
   user = this.gun.user().recall({sessionStorage: true})
   username = '';
  constructor(){
    // this.user.get('alias').on(v=>{this.username = v; console.log(v)}
    // );
    // this.gun.once('auth',async(event)=>{
    //   console.log();
      
    //   const alias = await this.user.get('alias');
    //   this.username = alias
    //   console.log("Logged as", this.username);
      
    // })
  }
}