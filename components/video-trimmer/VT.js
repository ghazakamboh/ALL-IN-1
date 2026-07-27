'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import UploadZone from '@/components/shared/UploadZone';
import ProgressBar from '@/components/shared/ProgressBar';
import ExportButton from '@/components/shared/ExportButton';
import ErrorBanner from '@/components/shared/ErrorBanner';
const SOFT_MB = 200;
const HARD_MB = 500;
const FFMPEG_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
