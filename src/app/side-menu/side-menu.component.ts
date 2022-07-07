import { FlatTreeControl } from '@angular/cdk/tree';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MatTreeFlattener, MatTreeFlatDataSource } from '@angular/material/tree';

interface NavNode {
  name: string;
  link?: string[];
  children?: NavNode[];
}

interface ExampleFlatNode {
  expandable: boolean;
  name: string;
  level: number;
}

const TREE_DATA: NavNode[] = [
  {
    name: '代码编辑器',
    link: ['/code-editor'],
    children: [{
      name: 'InfluxDB Editor',
      link: ['/code-editor/influxDB']
    }]
  }, {
    name: 'A*算法',
    link: ['/astar']
  }, {
    name: '3D 场景',
    children: [{
      name: '延迟渲染',
      link: ['three-d/deffered-rendering']
    }, {
      name: 'Life game',
      link: ['three-d/life-game']
    }, {
      name: 'InstanceMesh',
      link: ['three-d/instance-mesh']
    }]
  }, {
    name: '连通分量',
    link: ['/connect-area']
  }, {
    name: '图像分割',
    children: [{
      name: '大晶分割',
      link: ['/image-split/otsu']
    }, {
      name: '区域分裂与聚合',
      link: ['/split-unite-region']
    }, {
      name: 'Canny边缘检测',
      link: ['/image-split/canny']
    },]
  }, {
    name: '图像描述',
    children: [{
      name: 'Moore 边界描述',
      link: ['/image-desc/moore']
    }]
  }];

@Component({
  selector: 'app-side-menu',
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SideMenuComponent implements OnInit {
  private _transformer = (node: NavNode, level: number) => {
    return {
      expandable: !!node.children && node.children.length > 0,
      name: node.name,
      link: node.link,
      level: level,
    };
  }

  treeControl = new FlatTreeControl<ExampleFlatNode>(
    node => node.level, node => node.expandable);

  treeFlattener = new MatTreeFlattener(
    this._transformer, node => node.level, node => node.expandable, node => node.children);

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  constructor() {
    this.dataSource.data = TREE_DATA;
  }

  ngOnInit(): void {
  }

  hasChild = (_: number, node: ExampleFlatNode) => node.expandable;
}
