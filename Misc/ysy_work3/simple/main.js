/**
 
VUE.JS를 제외한 BKW 제어 예제

*/

function D2R(deg) {
    return deg * (Math.PI / 180.0);
}

function R2D(rad) {
    return rad * (180.0 / Math.PI); 
}

class BkwViewerClass {
    constructor (canvas, name) {
        canvas.addEventListener("webglcontextlost", function(e) { alert('WebGL context lost. You will need to reload the page.'); e.preventDefault(); }, false);

        // 마우스 휠 처리
        canvas.addEventListener("wheel", (function(e) {
            e.preventDefault(); 
            this.Module.setCameraRot_Fov( -e.deltaY / 50, true, true );
        }).bind(this), {passive: false});

        canvas.onpointerdown = (this.canvas_pointerdown).bind(this); 
        canvas.onpointerup   = (this.canvas_pointerup).bind(this);
        canvas.onpointermove = (this.canvas_pointermove).bind(this);

        this.name = name; 
        this.Module = {
            preRun: [
                (function(){
                    // console.log('Prerun 1');

                }).bind(this)
            ],

            postRun: [
                (this.initControl).bind(this),

                (function(){
                    // console.log('Postrun 1');

                }).bind(this)
            ],

            print: (function() {
                //var element = document.getElementById('output');
                //if (element) element.value = ''; // clear browser cache
                return function(text) {
                    if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
                    // These replacements are necessary if you render to raw HTML
                    text = text.replace(/&/g, "&amp;");
                    text = text.replace(/</g, "&lt;");
                    text = text.replace(/>/g, "&gt;");
                    text = text.replace('\n', '<br>', 'g');

                    console.log(text);

                    /*
                    if (element) {
                        element.value += text + "\n";
                        element.scrollTop = element.scrollHeight; // focus on bottom
                    }
                    */
                };
            })(),
            printErr: function(text) {
                //*
                if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
                if (0) { // XXX disabled for safety typeof dump == 'function') {
                    dump(text + '\n'); // fast, straight to the real console
                } else {
                    console.error(text);
                }
                //*/
            },

            canvas: canvas,

            setStatus: (function(text) {
                /*
                if (!this.Module.setStatus.last) this.Module.setStatus.last = { time: Date.now(), text: '' };
                if (text === this.Module.setStatus.text) return;
                var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
                var now = Date.now();
                if (m && now - Date.now() < 30) return; // if this is a progress update, skip it if too soon
                if (m) {
                    text = m[1];
                    progressElement.value = parseInt(m[2])*100;
                    progressElement.max = parseInt(m[4])*100;
                    progressElement.hidden = false;
                    //spinnerElement.hidden = false;
                } else {
                    progressElement.value = null;
                    progressElement.max = null;
                    progressElement.hidden = true;
                    //if (!text) spinnerElement.style.display = 'none';
                }
                statusElement.innerHTML = text;
                */
            }).bind(this),

            totalDependencies: 0,

            monitorRunDependencies: (function(left) {
                this.totalDependencies = Math.max(this.totalDependencies, left);
                this.Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
            }).bind(this),

        };

        this.Module = 
            prepareModule(
                this.Module, 
                //'/wasm/'
                window.location.pathname + 'wasm/'
            )

        //console.log(this.Module.setShadowMode); 

        //this.Module.setShadowMode(1)
    }

    printScene() {
        function printStructure( node, prefix = '  ' ) {
            for (let i=0; i<node.childCount; i++) {
                let child = node.getChild(i); 
                console.log(prefix + child.name, child.is_node?'(node)':`gm: ${child.geometry_id}`)
                printStructure( child, prefix + '  ' ); 
                child.delete();
            }
        }
  
        console.log('\n*base');
        {
          let base = this.Module.getRootNode(0);
          printStructure(base); 
          base.delete();
       }
  
        console.log('\n*fixt');
        {
          let fixt = this.Module.getRootNode(1);
          printStructure(fixt); 
          fixt.delete();
        }
  
        console.log('\n*efft');
        {
          let efft = this.Module.getRootNode(2);
          printStructure(efft); 
          efft.delete();
        }
  
    }

    // 화면상의 모든 엔터티 제거. 
    clearScene() {
        function removeChilds( node ) {
          for (let i=node.childCount-1; i >=0; i--) {
            let child = node.getChild(i); 
            child.removeFromScene();
            child.delete(); 
          }
  
        }
  
        removeChilds(this.Module.getRootNode(0));
        removeChilds(this.Module.getRootNode(1));
        removeChilds(this.Module.getRootNode(2));
  
        // TODO: 엔터티 제어용 객체들의 내부 홀더도 여기서 정리할 것. 
        this.floor = undefined; 
        this.testFixt_1 = undefined; 
        this.testFixt_2 = undefined; 
    }
  
    //=====================

    initControl() {

        window.addEventListener('resize', (function() {
            let w = this.Module.canvas.clientWidth;
            let h = this.Module.canvas.clientHeight;

            if (this.Module.canvas.width  != w) this.Module.canvas.width  = w;
            if (this.Module.canvas.height != h) this.Module.canvas.height = h;
            this.Module.setRenderSize(w, h);
        }).bind(this));

        // Set mouse action
        this.Module.useDefaultMouseAction(false); 

        this.isDownForCamera = false; 
        this.firstDownPos = undefined; 
        this.lastDownPos = undefined; 
        this.select_fixtr = undefined;

        // 마우스 드래그시 동작
        this.dragOperate = 'rotate';
        //this.dragOperate = 'pan';

        // 박스 클릭시 함수 설정
        //this.boxPointerDownFunc = null; 

        this.Module.setShadowMode(1);

    }

    canvas_pointerdown(e) {
        // console.log('pointerdown')
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);


        let select_fixtr = 
            this.Module.getIsectEntity(
                1, // search fixture root node
                e.offsetX, 
                e.offsetY, 
                2
            );

        // 선반 위에 놓은 물체는 씬 구조에서 루트->선반->컨테이너 아래에 위치. 
        // 깊이 2에서 발견되면서 부모가 'container' 이면 선반에 설정된 객체이다. 
        if (select_fixtr && select_fixtr.parent && select_fixtr.parent.name == 'container') {
            //console.log(select_fixtr.name, select_fixtr);

            this.isDownForCamera = false; 

            //console.log(this.boxPointerDownFunc);

            if (this.boxPointerDownFunc) this.boxPointerDownFunc(e.offsetX, e.offsetY, select_fixtr.name); 
        }
        else {
            this.isDownForCamera = true; 

            this.firstDownPos = {
                x: e.offsetX,
                y: e.offsetY
            }
    
            this.lastDownPos = {
                x: e.offsetX,
                y: e.offsetY
            }
        }
    }

    canvas_pointerup(e) {
        //console.log('pointerup')
        e.preventDefault();
        e.target.releasePointerCapture(e.pointerId);
  
        if (this.isDownForCamera) {
            this.isDownForCamera =  false; 
  
        }
  
    }

    canvas_pointermove(e) {
        if (this.isDownForCamera) {
            

            let dx = e.offsetX - this.lastDownPos.x; 
            let dy = e.offsetY - this.lastDownPos.y; 

            this.lastDownPos = {
                x: e.offsetX,
                y: e.offsetY
            }

            switch (this.dragOperate) {
                case 'rotate':
                    this.Module.setCameraRot_X( dy / 5.0 , true, true);
                    this.Module.setCameraRot_Y( dx / 5.0 , true, true);
                    break; 

                case 'pan':
                    {
                        let move_v = this.Module.cameraCalcPanning(-dx/10.0, dy/10.0);
                        this.Module.setCameraPos(move_v.x, move_v.y, move_v.z, true, true);
                    }
                    break; 

                case 'pan_xz':
                    {
                        let move_v = this.Module.cameraCalcPanning_XZ(-dx/10.0, dy/10.0);
                        this.Module.setCameraPos(move_v.x, move_v.y, move_v.z, true, true);
                    }
                    break; 
            }          
        }
    }
  
      
  
    //=====================


    // 바닥 만들기
    makeFloor(size_x, size_z) {
        if (this.floor) return; 
  
        this.floor = new FloorElement(this.Module, 'floor', size_x, size_z);
    }
  
    // 구조물 1 만들기
    makeTestFixt_1(pos_x, pos_z, rot_y) {
        if (!this.floor) return; 
        if (this.testFixt_1) return; 
        this.testFixt_1 = new TestElement(this.Module, 'test_1', pos_x, pos_z, rot_y); 
    }
  
    // 구조물 2 만들기
    makeTestFixt_2(pos_x, pos_z, rot_y) {
        if (!this.floor) return; 
        if (this.testFixt_2) return; 
        this.testFixt_2 = new TestElement(this.Module, 'test_2', pos_x, pos_z, rot_y); 
    }    

    // 구조물 1 이동
    moveTestFixt_1() {
        if (!this.testFixt_1) return; 

        // 현재 위치 구한다. 
        let pos = this.testFixt_1.getPos(); 

        // 현재 Y축 회전각 구한다.
        let rot = this.testFixt_1.getRot(); 

        // 15도 만큼 회전. 
        //console.log(rot); 
        rot.z += 15.0;
        console.log(rot.z); 
        this.testFixt_1.root.initRotTrack(false); 
        this.testFixt_1.root.addRotTrack(500, rot);

        // 현재 위치에서 rot.z +90 방향으로 5만큼 떨어진 곳까지 전진. 
        this.testFixt_1.root.initPosTrack(false); 
        this.testFixt_1.root.addPosTrack(500, pos);
        pos.x = pos.x + Math.sin(D2R(rot.z + 90)) * 5.0;
        pos.z = pos.z - Math.cos(D2R(rot.z + 90)) * 5.0; 
        this.testFixt_1.root.addPosTrack(1000, pos);

    }

    // 구조물 2 이동
    moveTestFixt_2() {
        if (!this.testFixt_2) return; 

        // 현재 위치 구한다. 
        let pos = this.testFixt_2.getPos(); 

        // 현재 Y축 회전각 구한다.
        let rot = this.testFixt_2.getRot(); 

        // 15도 만큼 회전. 
        //console.log(rot); 
        rot.z += 15.0;
        console.log(rot.z); 
        this.testFixt_2.root.initRotTrack(false); 
        this.testFixt_2.root.addRotTrack(500, rot);

        // 현재 위치에서 rot.z +90 방향으로 5만큼 떨어진 곳까지 전진. 
        this.testFixt_2.root.initPosTrack(false); 
        this.testFixt_2.root.addPosTrack(500, pos);
        pos.x = pos.x + Math.sin(D2R(rot.z + 90)) * 5.0;
        pos.z = pos.z - Math.cos(D2R(rot.z + 90)) * 5.0; 
        this.testFixt_2.root.addPosTrack(1000, pos);


    }

    //---------------

    // 벽 만들기
    makeWall() {
        if (!this.floor) return; 
        if (this.wall) return; 

        // 시작점 잡고
        this.wall = new WallElement(this.Module, 'wall', 1.0, 1.0, 0.5, 3.0);

        // 추가 기둥 세우기
        this.wall.addPost(10.0, 1.0);
        this.wall.addPost(20.0, 1.0);
    }

    // 벽 기둥 이동 테스트
    testWall() {
        if (!this.floor) return; 
        if (!this.wall) return; 


        this.wall.posts[1].z += 1; 
        this.wall.recalcWall(1); 

    }

    //---------------

    // 선반 테스트. 없으면 만들고 있으면 없앤다. 
    testShelf() {
        if (!this.floor) return; 
        if (this.shelf) {
            // 선반 제거하기
            this.shelf.root.removeFromScene();
            this.shelf = undefined; 
            return; 
        } 

        this.shelf = new ShelfElement(this.Module, 'shelf', 3, 2.5, 2.5, 0.5, 2, 3);
        this.shelf.setPos(3, 0, 3); 
    }

    // 다른 위치에 선반 테스트. 마찬가지로 없으면 만들고 있으면 없앤다.
    testShelf2() {
        if (!this.floor) return; 
        if (this.shelf2) {
            // 선반 제거하기
            this.shelf2.root.removeFromScene();
            this.shelf2 = undefined; 
            return; 
        } 

        this.shelf2 = new ShelfElement(this.Module, 'shelf2', 3, 2.5, 2.5, 0.5, 2, 3, false);
        this.shelf2.setPos(18, 0, 8); 
        this.shelf2.setRot(0, 0, 90);
    }

    testShelf_addBox(shelf) {
        if (!shelf) return; 

        function addRandomBox(diffuse) {
            let r = Math.floor(Math.random() * shelf.row_sizes.length);
            let c = Math.floor(Math.random() * shelf.col_sizes.length);

            if (!shelf.getObject(r, c)) {

                let box = new BoxElement(bkwViewer.Module, shelf.name + '_box_' + (diffuse - 0xFF000000).toString(16), 2, 1.5, 1.5, diffuse);
                shelf.setObject(r, c, box); 
            }

        }

        // 랜덤위치 붉은 박스 추가. 마지막 Blue값은 랜덤. 
        addRandomBox(0xFFFF0A00 + Math.floor(Math.random() * 0x0A));

        // 랜덤위치 노란 박스 추가. 마지막 Blue값은 랜덤. 
        addRandomBox(0xFFFFFF00 + Math.floor(Math.random() * 0x0A));

    }

    testShelf_remBox(shelf) {
        if (!shelf) return; 

        for (let r = 0; r<shelf.row_sizes.length; r++) {
            for (let c=0; c<shelf.col_sizes.length; c++) {
                shelf.remObject(r, c);
                // if (this.shelf.objects[r][c]) {
                //     this.shelf.objects[r][c].root.removeFromScene();
                //     this.shelf.objects[r][c] = null;
                // }
            }
        }
    }


    
}
