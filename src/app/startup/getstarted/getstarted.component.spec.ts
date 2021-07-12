import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GetstartedComponent } from './getstarted.component';

describe('GetstartedComponent', () => {
  let component: GetstartedComponent;
  let fixture: ComponentFixture<GetstartedComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GetstartedComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(GetstartedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
