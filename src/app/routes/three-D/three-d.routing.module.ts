import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DefferedRenderingComponent } from './deffered-rendering/deffered-rendering.component';

const routes: Routes = [
    {
        path: 'deffered-rendering',
        component: DefferedRenderingComponent
    },
    { path: '', redirectTo: 'deffered-rendering', pathMatch: 'full' }
];

@NgModule({
    imports: [
        RouterModule.forChild(routes)
    ],
    exports: [RouterModule]
})
export class ThreeDRoutingModule { }
