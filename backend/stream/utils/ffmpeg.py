# streams/utils/ffmpeg.py
import subprocess
from django.conf import settings

def start_rtsp_to_hls(rtsp_url, output_dir):
    command = [
        'ffmpeg',
        '-rtsp_transport', 'tcp',
        '-i', rtsp_url,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '3',
        f'{output_dir}/stream.m3u8'
    ]
    process = subprocess.Popen(command, stderr=subprocess.PIPE)
    return process