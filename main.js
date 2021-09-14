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
//https://svc.bkstr.com/store/config?storeName=sienastore
const storeNames = ["academyofourladypeacestore","acadiastore","adelphistore"];
const fetchData = async() => {
    try{
        for(let i=0; i<storeNames.length; i++){
            let storeName = storeNames[i];
            let strId = await getStore(storeName);
            let storeId = strId.storeId;
            let J = 0;
            if(typeof storeId == undefined)
            {
                console.log("blocked");
                exit;
            }
            console.log(storeId);
            let term_id = await getTerm(storeId);
            for(let j=0; j<term_id.length; j++){
                console.log(term_id[j]);
                let termId = term_id[j].termId;
                let programId = term_id[j].programId;
                if(typeof termId == undefined)
                {
                    console.log("blocked");
                    exit;
                }
                let department = await getDepartment(storeId,termId);
                let depName;
                let courseName;
                if(typeof department == undefined)
                {
                    console.log("blocked");
                    exit;
                }
                var depFile = JSON.stringify(department);
                fs.writeFile('./bkstr_deps/bkstr_'+storeName+'_'+storeId+'_'+termId+'_department.json',depFile, function (err) {
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
                            if(k<28){
                                fullData.push(course);
                                k++;
                            }else{
                                J++;
                                try{
                                    // get and store course data
                                    console.log('IN Store Data Function');
                                    storeData(storeName,storeId,termId,programId,depName,courseName,J,fullData);
                                    k=0;
                                    fullData = [];
                                }catch(err){
                                    console.log(err);
                                }
                            }
                        }
                    } 
                }
                if(k>0){
                    J++;
                    console.log('IN Store Data Function');
                    storeData(storeName,storeId,termId,programId,depName,courseName,J,fullData);
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
    // wait();
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
    // console.log(ret);
    // console.log(camp);
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
    ms = ms || false;
    if (!ms) {
        ms = generateTimeStamp(2000, 10000);
        ms = generateTimeStamp(2000, 8000);
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

async function storeData(storeName,strId,termId,programId,depName,courseName,J,fullData){
    console.log("Sending 20-data of ",storeName,", ",depName,", ",courseName," and section send to get course and book details.");
    //console.log('fullData',fullData);
    const newData = JSON.stringify(fullData);
    let store_data = await getCourses(strId,termId,programId,newData);
    // console.log('course details and books of given data.', store_data);
    const data = JSON.stringify(store_data);
    console.log('course details and books of given data.', store_data);
    // const data = JSON.stringify(value);
    fs.writeFile('./bkstr/bkstr_'+storeName+'_'+strId+'_'+termId+'_'+depName+'_'+courseName+'_'+J+'.json',data, function (err) {
        if (err) { 
            console.log(err);
        }
        console.log('storeData Saved');
        wait();
    });
    let cmdata = store_data;
    csvToJsonData()
    .fromFile("./csv/bkstr.csv")
    .then((source) => {
        cmdata.forEach(function (val, index) {
            const row = getBlankRow();
            // console.log(val["storeId"]);
            row["storeid"] = val.storeId;
            row["storenumber"] = val.storeNumber;
            row["storedisplayname"] = val.storeDisplayName;
            // console.log(row);
            if(!val.courseSectionDTO){
              source.push(row);
            }else{
              val.courseSectionDTO.forEach(function (val2, index2) {
                const row1 = getBlankRow();
                row1["storeid"] = val.storeId;
                row1["storenumber"] = val.storeNumber;
                row1["storedisplayname"] = val.storeDisplayName;
                row1["termid"] = val2.termId;
                row1["termname"] = val2.termName;
                row1["termnumber"] = val2.termNumber;
                row1["programid"] = val2.programId;
                row1["programname"] = val2.programName;
                row1["campusid"] = val2.campusId;
                row1["campusname"] = val2.campusName;
                row1["department"] = val2.department;
                row1["departmentname"] = val2.departmentName;
                row1["division"] = val2.division;
                row1["divisionname"] = val2.divisionName;
                row1["courseid"] = val2.courseId;
                row1["coursename"] = val2.courseName;
                row1["section"] = val2.section;
                row1["sectionname"] = val2.sectionName;
                row1["instructor"] = val2.instructor;
                row1["schoolname"] = val2.institutionName;
                // console.log(row);
                if(!val2.courseMaterialResultsList){
                  source.push(row1);
                }else{
                  val2.courseMaterialResultsList.forEach(function(val3,index3){
                    const row2 = getBlankRow();
                    row2["storeid"] = val.storeId;
                    row2["storenumber"] = val.storeNumber;
                    row2["storedisplayname"] = val.storeDisplayName;
                    row2["termid"] = val2.termId;
                    row2["termname"] = val2.termName;
                    row2["termnumber"] = val2.termNumber;
                    row2["programid"] = val2.programId;
                    row2["programname"] = val2.programName;
                    row2["campusid"] = val2.campusId;
                    row2["campusname"] = val2.campusName;
                    row2["department"] = val2.department;
                    row2["departmentname"] = val2.departmentName;
                    row2["division"] = val2.division;
                    row2["divisionname"] = val2.divisionName;
                    row2["courseid"] = val2.courseId;
                    row2["coursename"] = val2.courseName;
                    row2["section"] = val2.section;
                    row2["sectionname"] = val2.sectionName;
                    row2["instructor"] = val2.instructor;
                    row2["schoolname"] = val2.institutionName;
                    row2["cmid"] = val3.cmId;
                    row2["mtcid"] = val3.mtcId;
                    row2["bookimage"] = val3.bookImage;
                    row2["title"] = val3.title;
                    row2["edition"] = val3.edition;
                    row2["author"] = val3.author;
                    row2["isbn"] = val3.isbn;
                    row2["materialtype"] = val3.materialType;
                    row2["requirementtype"] = val3.requirementType;
                    row2["publisher"] = val3.publisher;
                    row2["publishercode"] = val3.publisherCode;
                    row2["productcatentryid"] = val3.productCatentryId;
                    row2["copyrightyear"] = val3.copyRightYear||"";
                    row2["pricerangedisplay"] = val3.priceRangeDisplay;
                    source.push(row2);
                  })
                }
              });
            }
        });
        const csv = jsonToCsvData(source,{fields:["storeid","storenumber","storedisplayname","termid","termname","termnumber","programid","programname","campusid","campusname","department","departmentname","division","divisionname","courseid","coursename","section","sectionname","instructor","schoolname","cmid","mtcid","bookimage","title","edition","author","isbn","materialtype","requirementtype","publisher","publishercode","productcatentryid","copyrightyear","pricerangedisplay"]});
        fs.writeFileSync("./csv/bkstr.csv",csv);
    });
}

function getHeaderString()
{
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