// `
(async()=>{
    const output = (message)=>{
        console.log(message);
    };
    while(true){
        try{
            const allAutomations = await fetch('https://weuit.com/api/getAllAutomationMeta',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
            });

            const allAutomationsJson = await allAutomations.json();
            const automationIdStatusPair = {};
            const mondayQuery = `query{
                ${allAutomationsJson.map((automation)=>{
                    const automationData = JSON.parse(automation.value);
                    automationIdStatusPair[`a${automation.id}`] = automationData.statusSelectValue;
                    return `a${automation.id}: boards (ids: ${automationData.currentBoardSelectValue}){
                        items_page (limit: 10, query_params: {rules: [{column_id: "status", compare_value: [${automationData.statusSelectValue}]}]}) {
                          items {
                            column_values(ids:"status"){
                                text
                            }
                            id
                          }
                        }
                    }`
                }).join('')}
            }`;
            // output('queryGenerated');
            const mondayFetch = async (query,files=null,version='2024-01') => {
                const headers = new Headers();
                // headers.append('Content-Type', 'application/json');
                headers.append('Authorization', 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjI4MjM3MTg2NiwiYWFpIjoxMSwidWlkIjozMjM3ODM5NiwiaWFkIjoiMjAyMy0wOS0xN1QyMDozMTo0My4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6ODg0NzExMCwicmduIjoidXNlMSJ9.KxbVZwzgjfITkHOCsFTQb0ZX84OwMOcg_AWKyXw9vE8');
                headers.append('API-Version', version);
        
                const formData = new FormData();
                formData.append('query', query);
                if(files){
                    formData.append('variables[file]', files);
                }
                const request = {
                    method: 'POST',
                    headers,
                    body: formData
                }
                const mondayResponse = await fetch (
                    `https://api.monday.com/v2`,
                    request
                );
                return mondayResponse;
            }
            const mondayResponse = await mondayFetch(mondayQuery);
            const mondayResponseJson = await mondayResponse.json();
            const mondayResponseData = mondayResponseJson.data;
            const mondayResponseErrors = mondayResponseJson.errors;
            // output('mondayQueryResponse');
            if(mondayResponseErrors){
                throw mondayResponseErrors;
            }
            const boardKeys = Object.keys(mondayResponseData);
            const itemStatusPairs = (()=>{
                const pairs = {};
                const automationKeys = Object.keys(mondayResponseData);
                automationKeys.forEach((automationKey)=>{
                    const items = mondayResponseData[automationKey][0].items_page.items;
                    items.forEach((item)=>{
                        pairs[item.id] = automationIdStatusPair[automationKey];
                    });
                });
                return pairs;
            })();
            // console.log(itemStatusPairs);
            const mondayMutation = `mutation{
                complexity{
                    before,after
                }
                ${boardKeys.map((boardKey)=>{
                    const automation = allAutomationsJson.find((automation)=>`a${automation.id}`===boardKey);
                    const automationData = JSON.parse(automation.value);
                    const items = mondayResponseData[boardKey][0].items_page.items;
                    const itemsIds = items.map((item)=>item.id);
                    if(itemsIds.length===0){
                        return '';
                    }else{
                        // `a1:move_item_to_board(board_id:1255820475,group_id:"1619703845_test",item_id:5659483717){
                        //     id
                        // }`;
                        console.log(`Moving ${itemsIds.length} items`)
                        // console.log(itemStatusPairs)
                        return `
                            ${itemsIds.map((itemId)=>{
                                console.log(itemStatusPairs[itemId]);
                                const status = items.find((item)=>item.id===itemId).column_values[0].text;
                                return `
                                b${itemId}:move_item_to_board(board_id:${automationData.destinationBoardSelectValue},group_id:"${automationData.groupSelectValue}",item_id:${itemId}){
                                    id
                                }
                                c${itemId}:change_simple_column_value(item_id:${itemId},board_id:${automationData.destinationBoardSelectValue},column_id:"status",value:"${status}"){
                                    id
                                }
                                `
                                // c${itemId}:change_column_value(item_id:${itemId},board_id:${automationData.destinationBoardSelectValue},column_id:"status",value:"{"index\":${itemStatusPairs[itemId]}}"){
                                //     id
                                // }
                            }).join('')}
                        `;
                    }
                }).join('')}
            }`;
            // console.log(mondayMutation)
            // output('mutationGenerated');
            const mondayMutationResponse = await mondayFetch(mondayMutation,null,"2024-01");
            const mondayMutationResponseJson = await mondayMutationResponse.json();
            const mondayMutationResponseData = mondayMutationResponseJson.data;
            const mondayMutationResponseErrors = mondayMutationResponseJson.errors;
            if(mondayMutationResponseErrors){
                throw mondayMutationResponseErrors;
            }
            // output(`${mondayMutationResponseData.complexity.before} -> ${mondayMutationResponseData.complexity.after}`);
            // output('Sleeping 30 seconds');
            // output('====================');
            // break;
        }catch(e){
            // break;
            console.log(e);
            await new Promise((resolve,reject)=>setTimeout(resolve,30000));
        }
        // sleep 1s
    }
})();