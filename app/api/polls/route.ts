import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    const type = url.searchParams.get('type');
    const showAll = url.searchParams.get('all') === 'true';

    if (!eventId) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Since Prisma enum filtering might strict check 'type', only include if valid string
    const whereClause: any = { eventId };
    if (type) whereClause.type = type;
    if (!showAll) whereClause.approved = true;

    try {
        const questions = await prisma.question.findMany({
            where: whereClause,
            orderBy: [
                { featured: 'desc' },
                { upvotes: 'desc' },
                { createdAt: 'desc' },
            ],
        });

        return NextResponse.json({ questions });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId, question, askerName, askerEmail, type, options } = body;

        if (!eventId || !question || !askerName || !type) {
            return NextResponse.json(
                { error: 'Event ID, question, asker name, and type are required' },
                { status: 400 }
            );
        }

        const q = await prisma.question.create({
            data: {
                eventId,
                question,
                askerName,
                askerEmail,
                type,
                options: options || [],
                votes: type === 'poll' ? new Array(options?.length || 0).fill(0) : [],
                answers: [], // Initialize as empty array
            },
        });

        return NextResponse.json({
            success: true,
            question: q,
            message: 'Submitted! It will appear after admin approval.',
        });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { questionId, action, data } = body;

        // Fetch current to calculate updates
        const current = await prisma.question.findUnique({ where: { id: questionId } });
        if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        let updateData: any = {};

        switch (action) {
            case 'approve':
                updateData.approved = data?.approved !== false;
                break;
            case 'feature':
                updateData.featured = data?.featured !== false;
                break;
            case 'edit':
                if (data?.question) updateData.question = data.question;
                if (data?.options && current.type === 'poll') {
                    updateData.options = data.options;
                    updateData.votes = new Array(data.options.length).fill(0); // Reset votes on edit options
                }
                break;
            case 'vote':
                if (current.type === 'poll' && typeof data?.optionIndex === 'number' && current.votes) {
                    const newVotes = [...current.votes];
                    newVotes[data.optionIndex] = (newVotes[data.optionIndex] || 0) + 1;
                    updateData.votes = newVotes;
                }
                break;
            case 'upvote':
                updateData.upvotes = { increment: 1 };
                break;
            case 'answer':
                if (current.type === 'qna' && data?.text && data?.authorName) {
                    const newAnswer = {
                        text: data.text,
                        authorName: data.authorName,
                        createdAt: new Date(),
                    };
                    const answers = Array.isArray(current.answers) ? current.answers : [];
                    updateData.answers = [...answers, newAnswer];
                    updateData.answered = true;
                }
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const updated = await prisma.question.update({
            where: { id: questionId },
            data: updateData,
        });

        return NextResponse.json({ success: true, question: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const url = new URL(request.url);
    const questionId = url.searchParams.get('questionId');

    if (!questionId) {
        return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    try {
        await prisma.question.delete({ where: { id: questionId } });
        return NextResponse.json({ success: true, message: 'Deleted' });
    } catch {
        return NextResponse.json({ error: 'Not found or failed' }, { status: 404 });
    }
}
