# 디렉토리 구조

* 다운로드 베이스
    * Bkws
    확장자 *.bkw. GM과 TT를 구성한 씬 정보. 
    크게 베이스, 구조물, 효과물 세 개의 루트노드를 가지고 있다. 

    * GGEOM
    확장자 *.gm. 지오메트리 정보를 담는다.

    * GTEXC
    확장자 *.tt. 텍스쳐 정보를 담는다. 
  

# 모듈 설정 함수

모듈의 기본값을 설정하는 함수들. 
초기 설정값은 모듈이 완전히 적재된 후 호출할 수 있도록 모듈객체의 `postRun` 에서 실행킨다. 


## setUrlBase(url_base)

다운로드 베이스 설정. 
이 함수가 호출되면 현재 리소스는 purge 된다. 또한 내부적으로 setBkwName() 이 호출된다. 
문자열의 마지막은 `"/"` 로 끝나야 한다. 

```js
    //Module.setUrlBase('https://xen-memories.github.io/');
    Module.setUrlBase('./');
```

## setBkwName(bkw_name)

화면에 표시할 bkw 의 이름 설정. 확장자는 제외. 

```js
    Module.setBkwName('FactoryLine2');
```

# 씬 제어 함수

## useDefaultMouseAction(setting)

마우스 기본동작 사용여부 설정. 
기본동작은 베이스를 클릭하면 해당 위치로 카메라 이동. 드래그는 회전이다. 
이 값을 끄면 마우스의 액션을 직접 정의해야 한다.

## setSceneDiffuse(r, g, b)

씬의 기본 조명 중 발산광 값을 설정. 
r, g, b 각 값은 0~1 사이의 실수값이다. 

```js
    // 발산광을 붉은색으로. 
    Module.setSceneDiffuse(1.0, 0.0, 0.0); 
```

## setSceneAmbient(r, g, b)

씬의 기본 조명 중 주변광 값을 설정. 

## setSceneFogColor(r, g, b, a)

씬의 안개색상 설정. 현재는 배경색을 지정하는 데 사용. 

```js
    // 배경색을 희게.
    Module.setSceneFogColor(1.0, 1.0, 1.0, 1.0); 
```

## setLightDir(x, y, z)

기본 직선광 조명의 방향 설정. (변경예정)


## setCameraPos(x, y, z, damping, delta)

카메라 타겟위치 조정. 
damping을 켜변 부드럽게 이동. 
delta 를 켜면 현재값에 대한 변위값으로 이동.

```js
    // 현재위치에서 x,z 평면으로 2 만큼 부드럽게 이동
    Module.setCameraPos(2, 0, 2, true, true)
```

## setCameraRot_X(value, damp, delta)

카메라 X 축 회전 설정. 
damping을 켜변 부드럽게 이동. 
delta 를 켜면 현재값에 대한 변위값으로 이동.


## setCameraRot_Y(value, damp, delta)

카메라 Y 축 회전 설정. 


## setCameraRot_Fov(value, damp, delta)

카메라 시야각 변경 설정. 


## setCameraPosSpeed(Ac, Vc, Dc)

카메라 이동속도 설정. 각 파라미터는 가속, 등속, 감속을 의미한다. 
기본값은 500, 5000, 50 으로 되어있다. 

## setCameraRotSpeed_X(Ac, Vc, Dc)

카메라 X축 회전속도 설정.
기본값은 30, 300, 3

## setCameraRotSpeed_Y(Ac, Vc, Dc)

카메라 Y축 회전속도 설정.
기본값은 X축 속도와 동일. 

## setCameraRotSpeed_Fov(Ac, Vc, Dc)

카메라 시야각 변경 속도 설정. 
기본값은 10, 100, 10

## setCameraDist(dist, near, far); 

카메라 거리, 근단면, 원단면 설정. 
기본값은 거리 30, 근단면 3, 원단면 100 으로 되어있다.

## setCameraLimit_X(offset, limL, limR)

카메라 X축 회전제한값 설정
기본값은 옵셋 45에 각각 20, 15. 즉 25~55 까지 변화.

## setCameraLimit_Y(offset, limL, limR)

카메라 Y축 회전제한값 설정
기본값은 0, 0, 0. 무제한 변경. 

## setCameraLimit_Fov(offset, limL, limR)

카메라 시야각 변경 제한값 설정
기본값은 기준 12, 12-3, 45-12. 즉 3~45 까지 변화. 


# 엔터티 제어 함수 및 자료형

주의!! emscripten의 한계로 인해 리턴받은 객체는 사용 후 delete로 제거해주어야 한다. 

## getRootNode(rootNodeIndex)

씬은 베이스, 구조물, 효과물이 트리구조로 구성되어있다. 
각 요소의 최상의 노드 리턴
루트노드 인덱스는 각각 0:베이스, 1:구조물, 2:효과물 이다. 


## getIsectEntity(rootNodeIndex, x, y, depthStep)

x, y 위치에 해당하는 엔터티 리턴. 
깊이탐색 스텝은 트리구조의 어디까지 탐색할지를 지정. 

```js
    canvas.onmousedown = function(event) {
        let a = Module.getIsectEntity(0, event.offsetX, event.offsetY, 10000); 
        console.log(a.name); 

        a.delete(); // 주의! 사용 후 호출 필요!!
    }
   
```

## getEntityByName()

미구현


## EntityHandle

씬을 구성하는 엔터티 제어 객체. 

* 공통값
    * name
    엔터티의 이름. 읽기전용
    
    * parent
    엔터티의 부모노드.

    * bound
    경계정보. 미구현. 

* 노드의 경우
    * childCount
    자식의 갯수

    * getChild(index)
    index 에 해당하는 자식 리턴

* 지오메트리의 경우
    * diffuse 
    재질색상. 
    0xffffffff - 흰색, 0xff000000 - 검은색.

    * blending 미구현

    * DFA, TSA, TMA 미구현

    
