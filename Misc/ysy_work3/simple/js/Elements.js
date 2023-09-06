/*

    BKW Viewr 내의 엘리먼트를 제어하기 위한 모듈
 
*/

// 엘리먼트가 생성한 BKW Viewer의 핸들을 엘리먼트 객체 제거시 정리하기 위해...
const destruct_reg = new FinalizationRegistry(obj => {
    //console.log(`Test #${id} has been garbage collected.`)
    console.log(`"${obj.name}" has been garbage collected.`)

    for (idx in obj.handles) {
        let handle = obj.handles[idx]; 
        //console.log('  handle delete', idx)
        if (handle) handle.delete(); 
    }
})

// 엘리먼트의 기본 동작 정의
class ElementBase {
    constructor (Module, name) {
        // 생성된 핸들을 담아두기 위한 배열 정의
        this.handles = []; 
        this.Module = Module; 
        this.name = name; 
        this.root = undefined; 

        destruct_reg.register(this, {
            name: this.name,
            handles: this.handles,
        })
    }

    setScale(x, y, z) {
        if (!this.root) return; 
        this.root.localScale = {x, y, z}
        this.root.recalcBound();
    }

    setRot(x, y, z) {
        if (!this.root) return; 
        this.root.localRot = {x, y, z}
        this.root.recalcBound();
    }

    setPos(x, y, z) {
        if (!this.root) return; 
        this.root.localPos = {x, y, z}
        this.root.recalcBound();
    }

    getScale() {
        if (this.root) 
            return this.root.localScale; 
        else    
            return {x:0, y:0, z:0}; 
    }

    getRot() {
        if (this.root) 
            return this.root.localRot; 
        else    
            return {x:0, y:0, z:0}; 
    }

    getPos() {
        if (this.root) 
            return this.root.localPos; 
        else    
            return {x:0, y:0, z:0}; 
    }
}

// 바닥 엘리먼트. 0번 지오메트리 단독 사용. 베이스로 추가. 
class FloorElement extends ElementBase {
    constructor (Module, name, size_x, size_z) {
        super(Module, name); 

        let baseRoot = Module.getRootNode(0);
        this.root = baseRoot.makeGeometry(0);
        this.root.diffuse = 0xFFAFFF00;
        
        this.root.name = name;
  
        this.root.localScale = {
          x: 1/28.1888961791992 * size_x,
          y: 1,
          z: 1/21.0377979278564 * size_z,
        }

        baseRoot.recalcBound();
        this.handles.push(this.root); 
    }
}

// 테스트 엘리먼트. 1번 지오메트리를 감싸는 노드 사용. 구조물로 추가. 
class TestElement extends ElementBase {
    constructor (Module, name, pos_x, pos_z, rot_y) {
        super(Module, name); 

        let fixtRoot = Module.getRootNode(1);

        this.root = fixtRoot.makeNode();
        this.root.name = name; 

        let geom = this.root.makeGeometry(1);
        geom.name = name + '_geom';

        geom.localPos = {
            x: -4.39907026290894 / 2,
            y: 0,
            z: 1.30000007152557 / 2,
        }

        this.root.localPos = {
            x: pos_x, 
            y: 0, 
            z: pos_z,
        }

        this.root.localRot = {
            x: 0, 
            y: 0, 
            z: rot_y,
        }

        geom.delete();

        this.handles.push(this.root); 
        fixtRoot.recalcBound();

    }
}


// 벽체. 0번 지오메트리를 스케일 조정해 사용. 구조물로 추가. 
// 기둥 이름은 post_0~n. 벽은 wall_0~n 으로 이름짓는다. 벽이 기둥보다 하나 적다. 
class WallElement extends ElementBase {
    // 시작위치, 폭과 높이를 받는다.
    constructor (Module, name, pos_x, pos_z, width, height) {
        super(Module, name); 

        let fixtRoot = Module.getRootNode(1);

        this.root = fixtRoot.makeNode();
        this.root.name = name; 

        // 기둥 배열 준비
        this.posts = [];

        // 이후 getter/setter 로 바꿀 것. 
        this.i_width = width; 
        this.i_height = height; 
        this.w_scale = 0.8;
        this.h_scale = 0.95; 

        this.handles.push(this.root); 

        this.addPost(pos_x, pos_z);

        fixtRoot.recalcBound();

    }

    // 기둥 박고, 그 사이 벽으로 채우기
    addPost(pos_x, pos_z) {
        let post_node = this.root.makeNode(); 
        post_node.name = 'post_' + this.posts.length.toString();

        let post_geom = post_node.makeGeometry(0);
        post_geom.name = 'post_geom_' + this.posts.length.toString();
        post_geom.localScale = {
            x: 1/28.1888961791992,
            y: 1/0.2316000051796439,
            z: 1/21.0377979278564,
        }
        post_geom.localPos = {
            x: -0.5,
            y: (-0.0146810002624989 * 1/0.2316000051796439) + 1, 
            z: -0.5,
        }
        post_geom.diffuse = 0xFFFFAFAF;

        post_node.localScale = {
            x: this.i_width,
            y: this.i_height,
            z: this.i_width,
        }

        post_node.localPos = {
            x: pos_x, 
            y: 0, 
            z: pos_z,

        }

        post_node.delete(); 
        post_geom.delete(); 

        //console.log('기둥 개수: ', this.posts.length)
        if (this.posts.length >= 1) {
            // 이전 기둥과 새 기둥의 거리 계산. 
            let dx = this.posts[this.posts.length-1].x - pos_x;
            let dz = this.posts[this.posts.length-1].z - pos_z;

            let dist = Math.sqrt( dx*dx + dz*dz );
            let ang = R2D( Math.atan2(dz, dx) );

            //console.log('거리: ', dist, ', 각도: ', ang)

            let wall_node = this.root.makeNode(); 
            wall_node.name = 'wall_' + this.posts.length.toString();
            let wall_geom = wall_node.makeGeometry(0);
            wall_geom.name = 'wall_geom_' + this.posts.length.toString();
            wall_geom.localScale = {
                x: 1/28.1888961791992,
                y: 1/0.2316000051796439,
                z: 1/21.0377979278564,
            }
            wall_geom.localPos = {
                x: 0,
                y: (-0.0146810002624989 * 1/0.2316000051796439) + 1, 
                z: -0.5,
            }
            wall_geom.diffuse = 0xFFFFDFDF;

            wall_node.localPos = {
                x: pos_x, 
                y: 0, 
                z: pos_z,
            }

            wall_node.localScale = {
                x: dist,
                y: this.i_height * this.h_scale,
                z: this.i_width  * this.w_scale,
            }

            wall_node.localRot = {
                x: 0, 
                y: 0, 
                z: ang,
            }

            wall_node.delete();
            wall_geom.delete();
        }

        this.posts.push(
            {
                x: pos_x, 
                z: pos_z,
            }
        );

        this.root.recalcBound(); 
    }

    recalcWall(post_index) {
        if (post_index < 0 || post_index >= this.posts.length) return; 

        // 기둥 노드 이동. 
        let post_node = this.root.getChildByName('post_' + post_index.toString(), 1);
        if (!post_node) return; 

        post_node.localPos = {
            x: this.posts[post_index].x,
            y: 0, 
            z: this.posts[post_index].z,
        }
        post_node.delete(); 

        // 이 기둥과 이전 기둥 사이의 벽 재조정. 
        if (post_index >= 1) {
            let wall_node = this.root.getChildByName('wall_' + post_index.toString(), 1);
            if (wall_node) {
                let dx = this.posts[post_index-1].x - this.posts[post_index].x;
                let dz = this.posts[post_index-1].z - this.posts[post_index].z;

                let dist = Math.sqrt( dx*dx + dz*dz );
                let ang = R2D( Math.atan2(dz, dx) );

                wall_node.localPos = {
                    x: this.posts[post_index].x, 
                    y: 0, 
                    z: this.posts[post_index].z,
                }
    
                wall_node.localScale = {
                    x: dist,
                    y: this.i_height * this.h_scale,
                    z: this.i_width  * this.w_scale,
                }
    
                wall_node.localRot = {
                    x: 0, 
                    y: 0, 
                    z: ang,
                }

                wall_node.delete(); 
    

            }
        }


        // 이 기둥과 다음 기둥 사이의 벽 재조정. 
        if (post_index < this.posts.length-1) {
            let wall_node = this.root.getChildByName('wall_' + (post_index+1).toString(), 1);
            if (wall_node) {
                let dx = this.posts[post_index].x - this.posts[post_index+1].x;
                let dz = this.posts[post_index].z - this.posts[post_index+1].z;

                let dist = Math.sqrt( dx*dx + dz*dz );
                let ang = R2D( Math.atan2(dz, dx) );

                wall_node.localScale = {
                    x: dist,
                    y: this.i_height * this.h_scale,
                    z: this.i_width  * this.w_scale,
                }

                wall_node.localRot = {
                    x: 0, 
                    y: 0, 
                    z: ang,
                }

                wall_node.delete(); 
            }

        }

    }

}

// 선반. 
class ShelfElement extends ElementBase {
    // 이름, 적재볼륨, 하단여백, 단, 칸, 두번째 기둥 설치여부를 인자로 받는다.
    constructor (Module, name, ix, iy, iz, by, r=1, c=1, secondPost = true) {
        super(Module, name); 

        this.base_y = by; 

        // 구조물로 동작
        let fixtRoot = Module.getRootNode(1); 
        this.root = fixtRoot.makeNode(); 
        this.root.name = name; 

        // 물건 올릴 노드 준비. 
        this.container = this.root.makeNode(); 
        this.container.name = 'container';

        // 구조물 노드 준비
        this.structure = this.root.makeNode(); 
        this.structure.name = 'structure';

        // 자동 제거 핸들에 추가. 
        this.handles.push(this.root, this.container, this.structure); 

        // 기둥 배열 준비
        this.posts = []; 
        // 선반 배열 준비
        this.plates = [];

        // 단 크기 배열 준비
        this.col_sizes = [ix];
        this.row_sizes = [iy]; 

        // 객체 배열 준비. 초기에는 1x1
        this.objects = [[null]];
        //this.objects.push([]);
        //this.objects[0].push(undefined);

        // 시작 기둥 두 개 박고
        this.setPost(0, 0, by+iy); 
        this.setPost(0, iz, by+iy); 

        // 추가기둥 설치플래그에 따라 기둥 추가.
        if (secondPost) {
            this.setPost(ix, 0, by+iy); 
            this.setPost(ix, iz, by+iy); 
        }


        // 쟁반 두 개 준비
        this.setPlate(ix, iz, by);
        this.setPlate(ix, iz, by + iy);

        // 단 추가
        for (let i=1; i<r; i++) {
            this.addRow(iy);
        }

        // 칸 추가
        for (let i=1; i<c; i++) {
            this.addColumn(ix);
        }
        
    }

    setPost(px, pz, hy) {
        let post_node = this.structure.makeNode(); 
        post_node.name = 'post_' + this.posts.length.toString();

        let post_geom = post_node.makeGeometry(0);
        post_geom.name = 'post_geom_' + this.posts.length.toString();
        post_geom.localScale = {
            x: 1/28.1888961791992,
            y: 1/0.2316000051796439,
            z: 1/21.0377979278564,
        }
        post_geom.localPos = {
            x: -0.5,
            y: (-0.0146810002624989 * 1/0.2316000051796439) + 1, 
            z: -0.5,
        }
        post_geom.diffuse = 0xFFAFAFFF;

        post_node.localScale = {
            x: 0.2,
            y: hy,
            z: 0.2,
        }

        post_node.localPos = {
            x: px, 
            y: 0, 
            z: pz,
        }

        this.posts.push(post_node.name)

        post_node.delete(); 
        post_geom.delete(); 
    }

    setPlate(ix, iz, py) {
        let plate_node = this.structure.makeNode();
        plate_node.name = 'plate_' + this.plates.length.toString();

        let plate_geom = plate_node.makeGeometry(0);
        plate_geom.name = 'plate_geom_' + this.plates.length.toString();
        plate_geom.localScale = {
            x: 1/28.1888961791992,
            y: 1/0.2316000051796439,
            z: 1/21.0377979278564,
        }
        plate_geom.localPos = {
            x: 0,
            y: (-0.0146810002624989 * 1/0.2316000051796439) + 1, 
            z: 0,
        }
        plate_geom.diffuse = 0xFFAFAFFF;

        plate_node.localScale = {
            x: ix,
            y: 0.05,
            z: iz,
        }

        plate_node.localPos = {
            x: 0, 
            y: py, 
            z: 0,
        }

        this.plates.push(plate_node.name);

        plate_node.delete(); 
        plate_geom.delete(); 

    }

    // 단 추가. 
    // 기둥의 갯수는 그대로. 기둥의 높이 변경.
    // 플레이트는 하나 늘어남. 
    addRow(iy_height) {
        let lastPlateName = this.plates[this.plates.length - 1];
        if (!lastPlateName) return; 
        
        let lastPlate = this.structure.getChildByName(lastPlateName, 1);
        if (!lastPlate) return; 

        let plateScale = lastPlate.localScale;
        let platePos = lastPlate.localPos;

        this.setPlate(plateScale.x, plateScale.z, platePos.y + iy_height);
        lastPlate.delete();

        for (let i=0; i<this.posts.length; i++) {
            let post = this.structure.getChildByName(this.posts[i], 1);
            if (!post) continue; 

            let postScale = post.localScale; 
            postScale.y += iy_height;
            
            post.localScale = postScale; 
            post.delete(); 
        }

        // 빈 객체 배열 추가
        this.objects.push((new Array(this.col_sizes.length)).fill(null));

        this.row_sizes.push(iy_height);
        this.root.recalcBound();
    }

    // 컬럼 추가
    // 플레이트의 크기 늘어남. 
    // 기둥의 높이 그대로. 추가 기둥 2개 설치.
    addColumn(ix_width, addPost = true) {
        let lastPlateName = this.plates[this.plates.length - 1];
        if (!lastPlateName) return; 
        
        let lastPlate = this.structure.getChildByName(lastPlateName, 1);
        if (!lastPlate) return; 

        let plateScale = lastPlate.localScale;
        plateScale.x += ix_width; 
        lastPlate.delete();

        for (let i=0; i<this.plates.length; i++) {
            let plate = this.structure.getChildByName(this.plates[i], 1);
            if (!plate) return; 

            plate.localScale = plateScale; 
        }

        if (addPost) {
            let firstPost = this.structure.getChildByName('post_0', 1);
            if (!firstPost) return; 
    
    
            this.setPost(plateScale.x,0, firstPost.localScale.y);
            this.setPost(plateScale.x, plateScale.z, firstPost.localScale.y);
        }

        this.col_sizes.push(ix_width); 

        //console.log('칸 증설', this.objects.length)
        for (let i=0; i<this.objects.length; i++) {
            //console.log('obj', i, this.objects[i])
            this.objects[i].push(null);
        }

        if (!addPost) this.root.recalcBound();
    }

    // 지정된 칸의 적재볼륨 정보 얻기
    getVolume(r, c) {
        if (r >= this.row_sizes.length) return null; 
        if (c >= this.col_sizes.length) return null; 

        let lastPlateName = this.plates[this.plates.length - 1];
        if (!lastPlateName) return null; 
        
        let lastPlate = this.structure.getChildByName(lastPlateName, 1);
        if (!lastPlate) return null; 

        let sizeZ = lastPlate.localScale.z;
        lastPlate.delete();

        let posY = this.base_y; 
        for (let i=0; i<r; i++) {
            posY += this.row_sizes[i];
        }
        let posX = 0;
        for (let i=0; i<c; i++) {
            posX += this.col_sizes[i];
        }

        return {
            size: {
                x: this.col_sizes[c],
                y: this.row_sizes[r],
                z: sizeZ,
            },
            pos: {
                x: posX,
                y: posY, 
                z: 0,
            }
        }

    }

    setObject(r, c, element_obj) {
        if (this.getObject(r, c)) return; 

        let volume = this.getVolume(r, c); 
        if (!volume) return; 

        this.objects[r][c] = element_obj;

        element_obj.root.parent = this.container;
        element_obj.setPos(
            volume.pos.x + volume.size.x / 2,
            volume.pos.y,
            volume.pos.z + volume.size.z / 2
        )

        this.container.recalcBound();
    }

    getObject(r, c) {
        return this.objects[r][c];
    }

    remObject(r, c) {
        let obj = this.objects[r][c];
        if (!obj) return; 
        this.objects[r][c] = null;

        obj.root.removeFromScene()

        this.container.recalcBound();
    }
}

// 중점이 밑면 가운데인 박스. 
class BoxElement extends ElementBase {
    // 이름, 크기, 컬러를  인자로 받는다.
    constructor (Module, name, sx=1, sy=1, sz=1, diffuse = 0xFFFF0A0A) {
        super(Module, name); 

        let fixtRoot = Module.getRootNode(1);

        this.root = fixtRoot.makeNode();
        this.root.name = name; 

        let box_geom = this.root.makeGeometry(0);
        box_geom.name = 'box_geom';
        box_geom.localScale = {
            x: 1/28.1888961791992,
            y: 1/0.2316000051796439,
            z: 1/21.0377979278564,
        }
        box_geom.localPos = {
            x: -0.5,
            y: (-0.0146810002624989 * 1/0.2316000051796439) + 1, 
            z: -0.5,
        }
        box_geom.diffuse = diffuse; 
        box_geom.delete(); 

        this.root.localScale = {
            x: sx, 
            y: sy, 
            z: sz,
        }

        this.handles.push(this.root); 
        this.root.recalcBound();
    }

    set diffuse(value) {
        console.log(value);

        let box_geom = this.root.getChildByName('box_geom', 1);
        if (!box_geom) return; 

        box_geom.diffuse = value; 
        box_geom.delete();
    }

    get diffuse() {
        let ret = 0xFF000000;
        let box_geom = this.root.getChildByName('box_geom', 1);
        if (box_geom) {
            ret = box_geom.diffuse;
            box_geom.delete();
        }

        return ret;
    }

}


/*
module.exports = {
    ElementBase, 
    FloorElement,

    TestElement,
}
*/