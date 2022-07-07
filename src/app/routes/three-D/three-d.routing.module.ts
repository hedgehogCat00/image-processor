import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DefferedRenderingComponent } from './deffered-rendering/deffered-rendering.component';
import { InstanceMeshComponent } from './instance-mesh/instance-mesh.component';
import { LifeGameComponent } from './life-game/life-game.component';

const routes: Routes = [
    {
        path: 'deffered-rendering',
        component: DefferedRenderingComponent
    },
    {
        path: 'life-game',
        component: LifeGameComponent
    },
    {
        path: 'instance-mesh',
        component: InstanceMeshComponent
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
