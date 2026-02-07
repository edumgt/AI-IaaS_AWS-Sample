require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// AWS 설정
AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

// 업로드할 파일 이름들
const fileNames = ['face1.png', 'face2.png', 'face3.png', 'face4.png'];

fileNames.forEach((fileName) => {
    const filePath = path.resolve(__dirname, fileName);
    
    // 파일 존재 여부 확인
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ 파일 없음: ${fileName}`);
        return;
    }

    const fileContent = fs.readFileSync(filePath);

    const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName, // S3에 저장될 이름
        Body: fileContent,
        ContentType: 'image/png',
        // ACL: 'public-read', // 필요 시 공개 접근 허용
    };

    s3.upload(uploadParams, (err, data) => {
        if (err) {
            console.error(`❌ ${fileName} 업로드 실패:`, err);
        } else {
            console.log(`✅ ${fileName} 업로드 성공!`);
            console.log(`📂 S3 위치: ${data.Location}\n`);
        }
    });
});
