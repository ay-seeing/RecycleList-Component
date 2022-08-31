/*
 * @Author: yiyang 630999015@qq.com
 * @Date: 2022-07-18 10:49:45
 * @LastEditors: yiyang 630999015@qq.com
 * @LastEditTime: 2022-08-31 11:55:13
 * @FilePath: /WeChatProjects/ComponentLongList/component/RecycleList/RecycleList.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/* 

无限滚动组件的使用方法：
wxml： 在父级组件的wxml里面插入组件，并设置好一个id： <RecycleList id="my_recycle"></RecycleList>
js： 在父组件的 onPageScroll 和 onReachBottom 事件里面分别调用组件内部方法，如：
...
// 页面滚动
  onPageScroll(res) {
    this.throttle(res, this);
  },
  throttle: throttle(function (res, that) {
    // 无限不能动-滚动调用组件函数， my_recycle 为组件id
    let myRecycle = that.selectComponent('#my_recycle');
    myRecycle.getPageScrollTop();
  }, 100, true),

  // 页面触底事件
  onReachBottom(){
    // // 无限不能动-获取组件并触发组件内触底加载函数， my_recycle 为组件id
    let myRecycle = this.selectComponent('#my_recycle');
    myRecycle.getDatas();
  },
...


注意：
1、一个页面只能使用一个无限滚动组件，否则会有问题。
2、不支持瀑布流
3、如果要使用一行多个，最好是使用等高，如果不等高可能会有UI显示问题
4、如果需要支持锚点，则必须是等高，否则没办法进行计算（目前还不支持锚点定位功能）



一行多个：
<RecycleList id="my_recycle" columnNumber="{{2}}"></RecycleList>

自定义无限滚动id：
<RecycleList id="my_recycle" generic:ItemProd="NftItem" class="result-list" columnNumber="{{3}}" recycleListContentId="recycleList-content2" hasContour="{{false}}" apiInfo="{{pledgeApiInfo}}" dataKey="nftList" initHasMore="{{hasMore}}" initList="{{nftList}}" chooseCardList="{{chooseCardList}}" recycle-item-class="recycleItem"  bind:noMoreCallback="noMoreFn">

参数说明：
apiInfo    必填, api请求的一些参数，因为接口的 url 是必填
  apiInfo字段示例：
    pledgeApiInfo: {
        url: 'node_nft.getUserNftPlayCollectList',
        apiData: {
            sortType: 'DEFAULT',
            sortAsc: true,
            nftFilterValues: [],
        },
        count: 90,
    },
id    必填，组件的id，用于父组件调用组件内部方法
generic:ItemProd    必填，渲染的子组件
hasShowCenterLoading   选填，是否显示接口请求的loading，需要自行开发，默认：显示
columnNumber    选填，目前样式最多支持3个，如果更多，需要自己添加css样式，默认： 1
hasContour    选填，每个item是否等高，默认： true
recycleListContentId   选填，组件内交互id，随意填写，默认： recycleList-content
dataKey   选填，接口获取list数据字段名称，默认： list ，可以使用.的方式获取，最多传入2层，如：  info.products
moreKey    选填，接口返回是否有更多字段，默认：hasMore
initList   选填，是否需要传入默认的list数据，默认： []
initHasMore   选填，配合 initList 使用，这传入默认数据后，是否还有更多数据，默认：true
chooseCardList   选填，业务逻辑需要，比如质押页面选择质押藏品浮层里面是否选中某个藏品，默认：无
recycle-box-class/recycle-list-class/recycle-item-class/recycle-loadding-class   选填，默认：无
bind:noMoreCallback  选填，没有更多回调函数，默认：无

*/
Component({
    options: {
      multipleSlots: true, // 在组件定义时的选项中启用多slot支持
      pureDataPattern: /^_/, // 指定所有 _ 开头的数据字段为纯数据字段
    },
    externalClasses: ['recycle-box-class', 'recycle-list-class', 'recycle-item-class', 'recycle-loadding-class'],  // 将父级的样式传给子组件使用
    properties: {
        initList: {// 父组件传入初始化list
            type: Array,
            value: [],
        }, 
        initHasMore: {  // 和传入的初始值配合使用，如果传入初始值时也同时没有更多，则组件内不会进行翻页加载了
            type: Boolean,
            value:true,
        },
        apiInfo: {   // 必传，api相关信息
            type: Object,
            value: {
                url: '',
                apiData: { }, // 除翻页外的其他接口参数，但不包含 offset 和 limit
                count: 30,  // 每页几个
            },
            observer: function(opt, oldOpt){
                this.setData({
                    _apiData: {
                        ...this.data._apiData,
                        limit: opt.count,
                    },
                }, ()=>{
                    // 对比两个对象是否一样
                    function hasSame(obj1, obj2){
                        // 判断两个对象是否存在，如果不存在则返回false
                        if(obj1 && obj2){
                            // 判断两个对象是否是同一个对象，如果是则返回true
                            if(obj1 === obj2){
                                return true;
                            }
                            // 判断两个对象键值数组长度是否一致，不一致返回 false
                            let obj1Props = Object.getOwnPropertyNames(obj1);
                            let obj2Props = Object.getOwnPropertyNames(obj2);
                            if(obj1Props.length !== obj2Props.length){
                                return false;
                            }

                            // 遍历对象的键值
                            for (let prop in obj1){
                                // 判断 obj1 的键值，在 obj2 中是否存在，不存在，返回 false
                                if(obj2.hasOwnProperty(prop)){
                                    // 判断 obj1 的键值是否为对象，是则递归，不是对象直接判断键值是否相等，不相等返回 false
                                    if (typeof obj1[prop] === 'object') {
                                        if (!hasSame(obj1[prop], obj2[prop])){
                                            return false
                                        }
                                    } else if (obj1[prop] !== obj2[prop]) {
                                        return false
                                    }
                                }else{
                                    return false;
                                }
                            }
                            return true;
                        }else{
                            return false;
                        }
                    }

                    // 为了初始化更快，初始化的时候在组件生命周期里面直接调用获取数据方法，只有当真正修改的接口请求参数的时候，才执行init
                    if(!hasSame(opt, oldOpt) && oldOpt && oldOpt.url){
                        this.init();
                    }
                })
            }
        },
        hasShowCenterLoading: {   // 是否显示页面中间的大loading，如果不显示，则显示list里面的小loading，大loading需要自己在接口请求的时候自己实现
            type: Boolean,
            value: true,
        },
        columnNumber: { // 一行显示几个
            type: Number,
            value: 1
        },
        dataKey: {   // 获取接口里面list数据的字段，最多支持两层，如： 'info.prducts' 获取接口content字段下info字段里面的prducts字段作为渲染list的数据
            type: String,
            value: 'list'
        },
        moreKey: {   // 是否有更多字段
            type: String,
            value: 'hasMore',
        },
        recycleListContentId: { // 无限列表id
            type: String,
            value: 'recycleList-content'
        },
        hasContour: {   // 里面的每个item是否是等高的
            type: Boolean,
            value: true,
        },
    },
    lifetimes: {
        // 组件初始化生命周期-组件初始化完成
        attached: function() {
            const self = this;
            // 获取可视区域高度
            wx.getSystemInfo({
                success: (res) => {
                self.data._showHeight = res.windowHeight;
                // console.log(res.windowHeight)
                },
                fail: ()=>{}
            });
        
            // 获取数据
            this.getDatas();
        }
    },
    data: {
        hasMore: true,
        listData: [],   // 将数据处理成二维数组
        scrollPageNumber:0,   // 可视区域的页码
        turnPageHeight: 0, // 无限翻页，每页的高度
        hasLoading: false,   // 是否正在获取数据

        // testBeforeHeight: 1000,  // 用于测试，无限滚动前面的元素高度

        // 以下为纯数据字段
        _hasUsedFirstInitData: false,  // 第一次传入的数据是否已经使用过
        _bakScrollPageNumber: 0,   // 上一次的页码，主要是用来对比页码是否改变更换数据
        _height: 0,   // 第一个子模块的高度
        _bakListData: [],  // 数据备份
        _currentPageNumber:0,  // 最后一次请求接口的页码
        _showHeight: 0, // 可视区域高度
        _diffHeight: 0,  // 无限滚动列表内部，第一个元素前面距离滚动列表顶部距离
        _apiData: { "limit": 30, "offset": 0 },   // 接口翻页参数

        _hasMock: true,  // 是否mock，开发时这里个字段要改成false
        _hasMoreMark: true,   // 接口请求完成后，设置 hasMore之前存存接口返回的 hasMore字段，等到需要渲染的数据渲染后再设置 hasMore字段，解决最后一页先看到没有更多文案，后渲染数据的显示问题
    },
    observers: {  // 数据变化监听
        // 'initHasMore': function(newVal){
        //     this.setData({
        //         hasMore: newVal,
        //     });
        // },
    },
    /**
     * 组件的方法列表
     */
    methods: {
        // 初始化
        init(){
            // 以下为纯数据字段
            this.data._bakScrollPageNumber = 0;   // 上一次的页码，主要是用来对比页码是否改变更换数据
            this.data._bakListData = [];  // 数据备份
            this.data._currentPageNumber =0;  // 最后一次请求接口的页码
            this.data._diffHeight = 0;  // 无限滚动列表内部，第一个元素前面距离滚动列表顶部距离
            this.data._apiData = {
                ...this.data._apiData,
                offset: 0,
            } || { "limit": 30, "offset": 0 };
            this.data._hasUsedFirstInitData = false;   // 传入的初始化数据标识为未使用
            this.data._hasMoreMark = true;

            // 以下是需要渲染的数据
            this.setData({
                hasMore: this.data.initHasMore !== undefined ? this.data.initHasMore : true,
                listData: [],   // 渲染的数据
                scrollPageNumber:0,   // 可视区域的页码
                hasLoading: false,   // 是否正在获取数据
            }, ()=>{
                // 获取数据
                this.getDatas();
            });
        },
        // 获取数据方法
        async getDatas() {
            wx.getStorageSync('debug') && console.log('component----', '加载数据-start')
            let {initList, hasMore, hasLoading, apiInfo, _apiData, _hasMock, _hasUsedFirstInitData, dataKey, moreKey, listData, initHasMore, hasShowCenterLoading} = this.data;

            // hasFirstPageData 是否传入了第一页的list数据，默认false，如果有传入则设置为true
            let hasFirstPageData = false;
            if(initList && initList.length > 0){
                hasFirstPageData = true;
            }
            // 如果没有更多，则直接返回
            // 判断如果正在加载，则进行节流处理，不请求下一次的接口请求
            if (((!hasFirstPageData || _hasUsedFirstInitData) && !hasMore )|| hasLoading) {
                return;
            }

            wx.getStorageSync('debug') && console.log('component----', '加载数据-ing',)
            // console.log('_apiData', _apiData)
            let curentP = _apiData.offset/_apiData.limit;
            
            // 请求接口
            let list = [];
            if(hasFirstPageData && !_hasUsedFirstInitData){
                list = initList;
                this.data._hasUsedFirstInitData = true;

                this.data._hasMoreMark = initHasMore;

                // 没有更多回调
                if(!this.data._hasMoreMark){
                    this.noMoreFn();
                }
            } else {
                // 请求接口前设置loading状态
                this.setData({
                    hasLoading: true,
                });
                // 使用promise模拟接口请求
                if(_hasMock){
                    await new Promise((res, rej) => {
                        setTimeout(()=>{
                            this.setData({
                                hasLoading: false,
                            });
                            res();
                        }, 200)
                    });
                    list.length=_apiData.limit;
                    list.fill({});

                    if(curentP >= Math.ceil(Math.random()*10 + 10)){
                        this.data._hasMoreMark = false;
                    }

                    // 没有更多回调
                    if(!this.data._hasMoreMark){
                        this.noMoreFn();
                    }
                }else{
                    
                    let resp = await app.$fetch({
                        url: apiInfo.url,
                        data: {
                            ...apiInfo.apiData,
                            pageParameter: JSON.stringify(_apiData)
                        },
                        showLoading: hasShowCenterLoading && !hasFirstPageData && listData.length === 0,
                    });
                    wx.getStorageSync('debug') && console.log('component----', '加载数据-end')
                    this.setData({
                        hasLoading: false,
                    });

                    let { content } = resp;
                    if (resp.error_num === 0 && content) {
                        let listMore = true;
                        let keyArr = dataKey.split('.');
                        if(keyArr[1]){
                            list = content[keyArr[0]][keyArr[1]] || [];
                            listMore = content[keyArr[0]][moreKey];
                        }else{
                            list = content[keyArr[0]] || [];
                            listMore = content[moreKey];
                        }

                        // 标记是否还有更多，这渲染完数据后渲染是否有更多
                        this.data._hasMoreMark = listMore;

                        // 没有更多回调
                        if(!this.data._hasMoreMark){
                            this.noMoreFn();
                        }
                    }else{
                        // 错误提示
                        this.setData({
                            hasMore: false,
                        });
                    }
                }
                
            }
           

            // 当前页数
            this.data._currentPageNumber = curentP;

            // 数据处理，给每条数据标识上页码
            list.forEach((item)=>{
                item.pageNumber = this.data._currentPageNumber;
            })

            // 将数据存储起来
            this.data._bakListData[this.data._currentPageNumber] = {
                list,
            }
            // }

            // 更新请求页码
            this.data._apiData.offset += this.data._apiData.limit;

            
            // this.setData({
            //     hasMore: true,
            // }, async ()=>{
                
            // });

            // 根据不能动页码获取需要显示的数据
            this.getShowData();
            
        },
        // 根据滚动页码获取需要显示数据
        getShowData(){
            let listData = []
            // 设置数据有多少页
            // listData.length = this.data._bakListData.length;
            // 将备份数据里面的存储dom高度的对象给 listData，用于后面渲染设置高度
            this.data._bakListData.forEach((item, i)=>{
                let {dom} = item;
                listData[i] = {
                    dom,
                }
            });


            // 根据页码获取当前页码前后1页的数据，将对应页码的数据全部替换掉
            if(this.data.scrollPageNumber>=1){
                listData[this.data.scrollPageNumber-1] = this.data._bakListData[this.data.scrollPageNumber-1];
            }
            if(this.data._bakListData[this.data.scrollPageNumber]){
                listData[this.data.scrollPageNumber] = this.data._bakListData[this.data.scrollPageNumber];
            }

            if(this.data._bakListData[this.data.scrollPageNumber+1]){
                listData[this.data.scrollPageNumber+1] = this.data._bakListData[this.data.scrollPageNumber+1];
            }

            // 将最近的3页数据显示出来
            this.setData({
                listData: listData,
                // 计算对应某一页的高度
                turnPageHeight: this.data._height ? this.data._height * (this.data._apiData.limit/ this.data.columnNumber) : 0,
            }, async ()=>{
                // 当未获取到高度的时候采取获取，如果已经获取到了就不需要再去获取高度了
                !this.data._height &&  await this.getItemHeight();

                // 判断是否是不等高子元素，如果是不等高子元素，则需要获取page高度，那么每页的高度就不通过第一个item去计算得到了，这里就需要获取下上一页的高度
                // console.log('this.data._currentPageNumber---', this.data._currentPageNumber, this.data._bakScrollPageNumber)
                if(!this.data.hasContour){
                    console.log('不等高')
                    // if(this.data._currentPageNumber > 0){
                    //     this.getPrevPageHeight(this.data._currentPageNumber-1);
                    // }
                    await setTimeout(async ()=>{  // 这里需要做个延迟，不然获取当前对应页码的高度可能会不准确
                        await this.getPrevPageHeight(this.data._currentPageNumber);
                    }, 50);
                    // console.log('this.data._bakListData---', JSON.parse(JSON.stringify(this.data._bakListData)))
                }else if(!this.data.turnPageHeight){
                    console.log('等高')
                    // this.setData({
                    //     // 计算对应某一页的高度
                    //     turnPageHeight: this.data._height ? this.data._height * (this.data._apiData.limit/ this.data.columnNumber) : 0,
                    // });

                    this.data._bakListData[this.data._currentPageNumber].dom ={
                        height: this.data.turnPageHeight,
                    }
                }else{
                    console.log('等高')
                    // if(this.data._currentPageNumber > 0){
                    //     this.data._bakListData[this.data._currentPageNumber -1].dom ={
                    //         height: this.data.turnPageHeight,
                    //     }
                    // }
                    // console.log('this.data._bakListData---',this.data.turnPageHeight, JSON.parse(JSON.stringify(this.data._bakListData)))
                    this.data._bakListData[this.data._currentPageNumber].dom ={
                        height: this.data.turnPageHeight,
                    }
                }

                this.setData({
                    hasMore: this.data._hasMoreMark,
                });
            })
        },

        // 获取单个元素的高度
        async getItemHeight(){
            let self = this;
            var query = this.createSelectorQuery();
            await new Promise((rej, ec)=>{
                query.select('.recycleList-item').boundingClientRect(function (res2) {
                    if(res2){
                        self.data._height = res2.height;
                    }
                    rej();
                }).exec();
            })
        },

        // 获取上一页的高度
        async getPrevPageHeight(pageN){
            let self = this;
            var query = this.createSelectorQuery();
            // console.log('----', '.item-page-'+pageN)
            await new Promise((rej, ec)=>{
                query.select('.item-page-'+pageN).boundingClientRect(function (res2) {
                    if(res2){
                        self.data._bakListData[pageN].dom = {
                            height: res2.height,
                        }
                    }
                    rej();
                }).exec();
            })
        },

        // 获取滚动高度，来计算当前页码
        getPageScrollTop(){
            let self = this;

            var query = this.createSelectorQuery()
            query.select(`#${this.data.recycleListContentId}`).boundingClientRect(function (res) {
                // console.log('self.data._diffHeight', self.data._diffHeight, self.data._showHeight, res.top)
                // 根据页面显示区域的底部位置计算当前是多少页
                let scrollP = 0;
                // 判断是否是等高，如果等高则直接计算，不等高则进行轮询，其实等高走轮询也行，为了优化性能，可以直接计算
                if(self.data.hasContour){
                    scrollP = Math.floor(Math.abs(res.top-self.data._showHeight+self.data._diffHeight)/self.data._height/(self.data._apiData.limit/self.data.columnNumber));
                }else{
                    let offsetTop = Math.abs(res.top-self.data._showHeight+self.data._diffHeight);
                    self.data._bakListData.forEach((item, i)=>{
                        if(item.dom && offsetTop >= 0){
                            scrollP = i;
                            offsetTop -= item.dom.height;
                        }
                    });
                    // console.log('scrollP---', scrollP)
                }

                // 判断上一次的备份页码和现在计算出来的页码是否相同，如果相同就不做处理（目的优化性能）
                if(self.data._bakScrollPageNumber === scrollP){
                    return;
                }

                // 获取当前的scroll页码，这和接口请求的当前页面不一样
                // 根据滚动位置和单个模块高度以及每页多少个来计算当前是第几页
                self.data._bakScrollPageNumber = scrollP;

                self.setData({
                    scrollPageNumber : scrollP,
                }, ()=>{
                    // 获取显示的页码数据
                    self.getShowData();
                    // console.log(self.data.scrollPageNumber)
                })
            }).exec();
        },

        // 无限滚动列表内部，所有滚动元素前面的元素高度有变化后需要调用下修正差值，也就是在 #recycleList-content 内部，第一个 recycleList-item 前面的元素
        getScrollAfterHeight(){
            let self = this;
            var query = this.createSelectorQuery()
            query.select(`#${this.data.recycleListContentId}-before`).boundingClientRect(function (res) {
                self.data._diffHeight = res.height;
                // console.log()
            }).exec();
        },

        beforeChangeHeight(){
            // this.setData({
            //     testBeforeHeight: this.data.testBeforeHeight + 100,
            // }, ()=>{
            //     // this.getScrollAfterHeight();
            // });
        },

        // 没有更多数据时触发
        noMoreFn(){
            // 触发父级的没有更多回调函数
            this.triggerEvent('noMoreCallback');
        },
    }
  });
  
  