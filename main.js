import fetch from 'node-fetch';
import * as fs from 'fs';
import { exit } from 'process';
import { compileFunction } from 'vm';
import express from "express";
// Define "require"
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// json to csv modules
const csvToJsonData = require("csvtojson");
const jsonToCsvData = require("json2csv").parse;
// "academyofourladypeacestore","acadiastore","adelphistore"
// alabamaamstore,alabamastatestore,alamanceccstore,alamedastore,alaskafairbanksstore,albanystatestore,albanystore,alcornstatestore,algomastore
//https://svc.bkstr.com/store/config?storeName=sienastore  

// babsonstore baptisthsustore barrylawstore  ,"barstowccstore"

const storeNames = ["bellevuestore",
// "bemidjistatestore"
];
const fetchData = async() => {
    try{
        for(let i=0; i<storeNames.length; i++){
            let storeName = storeNames[i];
            let strId = await getStore(storeName);
            let storeId = strId.storeId;
            let J = 0;
            if(typeof storeId == "undefined")
            {
                console.log("blocked");
                process.exit(0);
            }
            console.log(storeId);
            let term_id = await getTerm(storeId);
            for(let j=0; j<term_id.length; j++){
                console.log(term_id[j]);
                let termId = term_id[j].termId;
                let programId = term_id[j].programId;
                if(typeof termId == "undefined")
                {
                    console.log("blocked");
                    process.exit(0);
                }
                let department = await getDepartment(storeId,termId);
                let depName;
                let courseName;
                if(typeof department == "undefined")
                {
                    console.log("blocked");
                    process.exit(0);
                }
                var depFile = JSON.stringify(department);
                fs.writeFile('./bkstr_deps/bkstr_'+storeName.split(" ").join("")+'_'+storeId.split(" ").join("")+'_'+termId.split(" ").join("")+'_department.json',depFile, function (err) {
                    if (err) throw err;
                    console.log('Department Saved');
                });
                let fullData = [];
                let k = 0;
                // let l = 0;
                for(let m=0; m<department.length; m++){
                    depName = department[m].depName;
                    let courses = department[m].course;
                    for(let n=0; n<courses.length; n++){
                        courseName = courses[n].courseName;
                        let sections = courses[n].section;
                        for(let a=0; a<sections.length; a++){
                            let section = sections[a].sectionName;
                            let course = {"secondaryvalues":depName+"/"+courseName+"/"+section,"divisionDisplayName":"","departmentDisplayName":depName,"courseDisplayName":courseName,"sectionDisplayName":section};
                            if(k<20){
                                fullData.push(course);
                                k++;
                            }else{
                                J++;
                                if(J>70){
                                    try{
                                        // get and store course data
                                        console.log('IN Store Data Function');
                                        await storeData(storeName,storeId,termId,programId,depName,courseName,J,fullData);
                                    }catch(err){
                                        console.log(err);
                                    }
                                }
                                k=0;
                                fullData = [];
                            }
                        }
                    } 
                }
                if(k>0){
                    J++;
                    console.log('IN Store Data Function');
                    await storeData(storeName,storeId,termId,programId,depName,courseName,J,fullData);
                }
            }
        }
    }catch(err){
        console.log(err);
    }
}

fetchData();
//get storeId from link of arrays.
async function getStore(storeName) {
    wait();
    const str =  await fetch(`https://svc.bkstr.com/store/config?storeName=${storeName}`, {
        method: 'GET',
        mode: 'cors',
        headers: getHeaderString(),
    })
    // console.log(str)
    const ret = await str.json();  
    return ret; 
}

//get termId and programId from storeId
async function getTerm(storeId) {
    wait();
    //https://svc.bkstr.com/courseMaterial/info?storeId=166904
    const str =  await fetch(`https://svc.bkstr.com/courseMaterial/info?storeId=${storeId}`, {
        method: 'GET',
        mode: 'cors',
        headers: getHeaderString(),
    });
    const ret = await str.json();  
    var termData = [];
    console.log('term id and program id');
    let camp = ret.finalData?.campus;
    if(!camp || typeof camp == "undefined"){
        console.log("no campus or you are blocked");
        process.exit(0);
    }else{
        camp.forEach(function(val,index){
            val.program[0].term.forEach(function(val2,index2){
                let termId = val2.termId;
                let programId = val.program[0].programId;
                termData.push({termId,programId});
            })
        })
        // console.log(termData);
        return termData;  
    }
}

async function getDepartment(storeId,termId) {
    wait();
    //https://svc.bkstr.com/courseMaterial/courses?storeId=166904&termId=100070759
    const d =  await fetch(`https://svc.bkstr.com/courseMaterial/courses?storeId=${storeId}&termId=${termId}`, {
        method: 'GET',
        mode: 'cors',
        headers: getHeaderString(),
    })
    const ret = await d.json();  
    console.log('dpartment');
    // console.log(ret.finalDDCSData?.division[0]?.department);
    let dep = ret.finalDDCSData?.division[0]?.department;
    console.log(dep);
    return dep;  
}

async function getCourses(storeId,termId,programId,fullData) {
    wait();
    const rest = await fetch(`https://svc.bkstr.com/courseMaterial/results?storeId=${storeId}&langId=-1&requestType=DDCSBrowse`, {
        method: 'POST',
        headers: getHeaderString(),
        body: '{"storeId":'+storeId+',"termId":'+termId+',"programId":'+programId+',"courses":'+fullData+'}'
    });
    const ret = await rest.json();   
    return ret;  
}

function wait(ms){
    return;
    ms = ms || false;
    if (!ms) {
        // ms = generateTimeStamp(20000, 30000);
    
        ms = generateTimeStamp(2000, 4000);
    }
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
        end = new Date().getTime();
    }
}

function generateTimeStamp(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

async function storeData(storeName,storeId,termId,programId,depName,courseName,J,fullData){
    console.log("Sending 20-data of ",storeName,", ",storeId,", ",termId,", ",depName,", ",courseName," and section send to get course and book details.");
    //console.log('fullData',fullData);
    const newData = JSON.stringify(fullData);
    let store_data = await getCourses(storeId,termId,programId,newData);
    // console.log('course details and books of given data.', store_data);
    // let storeId = trim(storeId);
    const data = JSON.stringify(store_data);
    let cmdata = store_data;
    if(cmdata.blockScript){
        console.log("you are blocked");
        process.exit(0);
    }
    console.log('course details and books of given data.', store_data);
    // const data = JSON.stringify(value);
    fs.writeFile('./bkstr/bkstr_'+storeName.split(" ").join("")+'_'+storeId.split(" ").join("")+'_'+termId.split(" ").join("")+'_'+depName.split(" ").join("")+'_'+courseName.split(" ").join("")+'_'+J+'.json',data, function (err) {
        if (err) { 
            console.log(err);
        }
        console.log('storeData Saved');
        // wait();
    });
    if(!cmdata || cmdata.length<1){
        console.log("course is empty");
    }else{
        csvToJsonData()
        .fromFile("./csv/bkstr.csv")
        .then((source) => {
            for(let i=0; i<cmdata.length; i++) {
                const row = getBlankRow();
                // console.log(val["storeId"]);
                row["storeid"] = cmdata[i].storeId;
                row["storenumber"] = cmdata[i].storeNumber;
                row["storedisplayname"] = cmdata[i].storeDisplayName;
                // console.log(row);
                if(!cmdata[i].courseSectionDTO){
                  source.push(row);
                }else{
                    let courseSection = cmdata[i].courseSectionDTO;
                    for(let j=0; j<courseSection.length; j++){
                        const row1 = getBlankRow();
                        row1["storeid"] = cmdata[i].storeId;
                        row1["storenumber"] = cmdata[i].storeNumber;
                        row1["storedisplayname"] = cmdata[i].storeDisplayName;
                        row1["termid"] = courseSection[j].termId;
                        row1["termname"] = courseSection[j].termName;
                        row1["termnumber"] = courseSection[j].termNumber;
                        row1["programid"] = courseSection[j].programId;
                        row1["programname"] = courseSection[j].programName;
                        row1["campusid"] = courseSection[j].campusId;
                        row1["campusname"] = courseSection[j].campusName;
                        row1["department"] = courseSection[j].department;
                        row1["departmentname"] = courseSection[j].departmentName;
                        row1["division"] = courseSection[j].division;
                        row1["divisionname"] = courseSection[j].divisionName;
                        row1["courseid"] = courseSection[j].courseId;
                        row1["coursename"] = courseSection[j].courseName;
                        row1["section"] = courseSection[j].section;
                        row1["sectionname"] = courseSection[j].sectionName;
                        row1["instructor"] = courseSection[j].instructor;
                        row1["schoolname"] = courseSection[j].institutionName;
                        // console.log(row);
                    if(!courseSection[j].courseMaterialResultsList){
                      source.push(row1);
                    }else{
                        let courseMaterialResults = courseSection[j].courseMaterialResultsList;
                        for(let k=0; k<courseMaterialResults.length; k++){
                            const row2 = getBlankRow();
                            row2["storeid"] = cmdata[i].storeId;
                            row2["storenumber"] = cmdata[i].storeNumber;
                            row2["storedisplayname"] = cmdata[i].storeDisplayName;
                            row2["termid"] = courseSection[j].termId;
                            row2["termname"] = courseSection[j].termName;
                            row2["termnumber"] = courseSection[j].termNumber;
                            row2["programid"] = courseSection[j].programId;
                            row2["programname"] = courseSection[j].programName;
                            row2["campusid"] = courseSection[j].campusId;
                            row2["campusname"] = courseSection[j].campusName;
                            row2["department"] = courseSection[j].department;
                            row2["departmentname"] = courseSection[j].departmentName;
                            row2["division"] = courseSection[j].division;
                            row2["divisionname"] = courseSection[j].divisionName;
                            row2["courseid"] = courseSection[j].courseId;
                            row2["coursename"] = courseSection[j].courseName;
                            row2["section"] = courseSection[j].section;
                            row2["sectionname"] = courseSection[j].sectionName;
                            row2["instructor"] = courseSection[j].instructor;
                            row2["schoolname"] = courseSection[j].institutionName;
                            row2["cmid"] = courseMaterialResults[k].cmId;
                            row2["mtcid"] = courseMaterialResults[k].mtcId;
                            row2["bookimage"] = courseMaterialResults[k].bookImage;
                            row2["title"] = courseMaterialResults[k].title;
                            row2["edition"] = courseMaterialResults[k].edition;
                            row2["author"] = courseMaterialResults[k].author;
                            row2["isbn"] = courseMaterialResults[k].isbn;
                            row2["materialtype"] = courseMaterialResults[k].materialType;
                            row2["requirementtype"] = courseMaterialResults[k].requirementType;
                            row2["publisher"] = courseMaterialResults[k].publisher;
                            row2["publishercode"] = courseMaterialResults[k].publisherCode;
                            row2["productcatentryid"] = courseMaterialResults[k].productCatentryId;
                            row2["copyrightyear"] = courseMaterialResults[k].copyRightYear||"";
                            row2["pricerangedisplay"] = courseMaterialResults[k].priceRangeDisplay;
                            source.push(row2);
                        }
                    }
                  }
                }
            }
            const csv = jsonToCsvData(source,{fields:["storeid","storenumber","storedisplayname","termid","termname","termnumber","programid","programname","campusid","campusname","department","departmentname","division","divisionname","courseid","coursename","section","sectionname","instructor","schoolname","cmid","mtcid","bookimage","title","edition","author","isbn","materialtype","requirementtype","publisher","publishercode","productcatentryid","copyrightyear","pricerangedisplay"]});
            fs.writeFileSync("./csv/bkstr.csv",csv);
            console.log("saved json data in csv");
        });
    }
}

function getHeaderString() {
    return  {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36'
    }
}

function getBlankRow() {
    return {
        storeid: "",
        storenumber: "",
        storedisplayname: "",
        termid:"",
        termname:"",
        termnumber:"",
        programid:"",
        programname:"",
        campusid:"",
        campusname:"",
        department:"",
        departmentname:"",
        division:"",
        divisionname:"",
        courseid:"",
        coursename:"",
        section:"",
        sectionname:"",
        instructor:"",
        schoolname:"",
        cmid:"",
        mtcid:"",
        bookimage:"",
        title:"",
        edition:"",
        author:"",
        isbn:"",
        materialtype:"",
        requirementtype:"",
        publisher:"",
        publishercode:"",
        productcatentryid:"",
        copyrightyear:"",
        pricerangedisplay:""
    };
}